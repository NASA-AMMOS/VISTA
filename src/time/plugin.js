import ERTTimeSystem from './ERTTimeSystem.js';
import SCETTimeSystem from './SCETTimeSystem.js';
import SCLKTimeSystem from './SCLKTimeSystem.js';
import MSLSolTimeSystem from './MSLSolTimeSystem.js';
import LMSTTimeSystem from './LMSTTimeSystem.js';
import UTCClock from './UTCClock.js';
import LADClock from './LADClock.js';
import MSLSolFormat from '../formats/MSLSOLFormat.js';
import LMSTFormat from '../formats/LMSTFormat.js';
import moment from 'moment';

const SYSTEM_MAP = {
  ert: ERTTimeSystem,
  scet: SCETTimeSystem,
  sclk: SCLKTimeSystem,
  'msl.sol': MSLSolTimeSystem,
  lmst: LMSTTimeSystem
};

export default function TimePlugin(options) {
  return function install (openmct) {
    var TODAY_BOUNDS = {
      start: moment.utc().startOf('day').valueOf(),
      end: moment.utc().endOf('day').valueOf()
    };

    var solFormat = new MSLSolFormat(openmct);
    var lmstFormat = new LMSTFormat(openmct);
    var nowLST = solFormat.format(moment.utc());
    var sol = Number(/SOL-(\d+)M/.exec(nowLST)[1]);

    var BOUNDS_MAP = {
      ert: TODAY_BOUNDS,
      scet: TODAY_BOUNDS,
      sclk: {
          start: 1,
          end: 10000
      },
      'msl.sol': {
          start: solFormat.parse('SOL-' + sol),
          end: solFormat.parse('SOL-' + (sol + 1))
      },
      lmst: {
          start: lmstFormat.parse('SOL-' + sol),
          end: lmstFormat.parse('SOL-' + (sol + 1))
      }
    };

    if (!options.timeSystems) {
        console.error('Please specify one or more time systems to enable.');
    }

    if (options.lmstEpoch) {
        var lmstFormatWithEpoch = new LMSTFormat(options.lmstEpoch);

        BOUNDS_MAP.lmst = {
            start: lmstFormatWithEpoch.parse('SOL-' + sol),
            end: lmstFormatWithEpoch.parse('SOL-' + (sol + 1))
        };
    }

    install.ladClocks = {};
    install.timeSystems = options.timeSystems;
    let useUTCClock = false;
    let menuOptions = [];


    options.timeSystems.forEach(function (timeSystem) {
        const key = timeSystem.key || timeSystem;

        if (!SYSTEM_MAP[key]) {
            console.error('Invalid timeSystem specified: ' + key);
            return;
        }

        const system = new SYSTEM_MAP[key](options.utcFormat);
        openmct.time.addTimeSystem(system);

        const systemOptions = {
            timeSystem: system.key,
            name: 'fixed'
        };
        if(timeSystem.modeSettings?.fixed?.bounds){
            systemOptions.bounds=timeSystem.modeSettings.fixed.bounds;

        } else {
            systemOptions.bounds=BOUNDS_MAP[key];
        }

        if (timeSystem.modeSettings?.fixed?.presets) {
            systemOptions.presets = timeSystem.modeSettings.fixed.presets;
        }
        if (timeSystem.limit) {
            systemOptions.limit = timeSystem.limit;
        }
        if (options.records) {
            systemOptions.records = options.records;
        }

        

        menuOptions.push(systemOptions);
        
        if (options.allowRealtime && system.isUTCBased) {
            var offsetConfig = {
                start: -30 * 60 * 1000,
                end: 5 * 60 * 1000
            }
            var presetConfig = []
            if (timeSystem.modeSettings?.realtime?.clockOffsets){
                offsetConfig = timeSystem.modeSettings.realtime.clockOffsets
            }
            if (timeSystem.modeSettings?.realtime?.presets){
                presetConfig = timeSystem.modeSettings.realtime.presets
            }
            useUTCClock = true;
            menuOptions.push({
                name:'realtime',
                timeSystem: system.key,
                clock: 'utc.local',
                clockOffsets: offsetConfig,
                presets: presetConfig            
            });
        }
        if (options.allowRealtime && options.allowLAD) {
            var ladClock = new LADClock(key);
            var offsetConfig = {
                start: -30 * 60 * 1000,
                end: 5 * 60 * 1000
            }
            if (timeSystem.modeSettings?.lad?.clockOffsets){
                offsetConfig = timeSystem.modeSettings.lad.clockOffsets
            }

            install.ladClocks[key] = ladClock;
            openmct.time.addClock(ladClock);
            menuOptions.push({
                timeSystem: system.key,
                clock: ladClock.key,
                clockOffsets: offsetConfig,
            });
        }
    });
    if (options.defaultMode) {
        
        let matchingConfigIndex = menuOptions.findIndex(menuOption => 
            menuOption.clock === options.defaultMode);

        if (matchingConfigIndex !== -1) {
            let matchingConfig = menuOptions[matchingConfigIndex]; 
            menuOptions.splice(matchingConfigIndex, 1);
            menuOptions.unshift(matchingConfig);
        } else {
            console.warn(`Default mode '${options.defaultMode}' specified in configuration could not be applied. 
                Are LAD or realtime enabled? Does the defaultMode contain a typo?`);
        }
    }
    
    if (useUTCClock) {
        openmct.time.addClock(new UTCClock());
    }

    openmct.install(openmct.plugins.Conductor({
        menuOptions: menuOptions
    }));
  }
}
