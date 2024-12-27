(function () {
    const openmctMCWSConfig = {
        /**
         * camUrl: url to the CAM server this instance uses for auth.
         * ***** REQUIRED *****
         */
        camUrl: '',
        /**
         * mcwsUrl: url for MCWS root.
         * ***** REQUIRED *****
         */
        mcwsUrl: '',
        /**
         * theme: either 'Snow', 'Espresso' or 'Maelstrom'
         */
        theme: 'Snow',

        /**
         * Namespaces: each entry below adds a root folder.
         *
         * Namespace Properties:
         * * key: string, unique key for this namespace.
         * * name: string, user-visible name for this namespace.
         * * url: string, URL to MCWS namespace which will store the contents of
         *        the namespace
         * * userNamespace: boolean, optional, defaults to false.  If true, this
         *                  namespace will be used to create per-user folders.
         * 
         * ***** URL REQUIRED *****
         */
        namespaces: [
            {
                key: 'r50-dev',
                name: 'R5.0 Shared',
                url: ''
            },
            {
                userNamespace: true,
                key: 'r50-dev',
                name: 'R5.0 Users',
                url: ''
            }
        ],

        /**
         * venueAware - options here enable venue aware mode and allow
         * configuration of venue aware mode.  Added in R4.0.
         *
         * Venue aware configuration allows pre-configuration with a
         * list of venues and datasets such that users are prompted to select
         * either an active venue or a historical session that they'd like to
         * review.
         *
         * Enabling venue-aware mode disables manual creation of datasets.
         */
        venueAware: {
            /**
             * enabled: {true, false}
             */
            enabled: false,

            /**
             * venues: either a list of venue definitions or a url for a JSON
             * venue definition file.
             * If a url is provided, it will be queried at run time
             * to determine the venues available.
             *
             * An example of a JSON venue definition file is provided in
             * "ExampleVenueDefinitions.json".
             */
            venues: "ExampleVenueDefinitions.json"
        },

        /**
         * Taxonomy: options here effect how various telemetry types are
         * displayed.
         */
        taxonomy: {

            /**
             * evrDefaultBackgroundColor: default background color for EVRs.
             * Set to `undefined` to use the theme default.  Otherwise, specify
             * a hex string for an RGB color, e.g. `#ababab`.
             */
            evrDefaultBackgroundColor: undefined,

            /**
             * evrDefaultForegoundColor: default foreground color for EVRs.
             * Set to `undefined` to use the theme default.  Otherwise, specify
             * a hex string for an RGB color, e.g. `#ababab`.
             */
            evrDefaultForegoundColor: undefined,

            /**
             * evrBackgroundColorByLevel: specify the background color of EVRs
             * by level.  If a level is not defined here, it will use the
             * default specified above. Keys are specific EVR levels, and values
             * must be a a hex string for an RGB color, e.g. `#ababab`.
             */

            evrBackgroundColorByLevel: {
                /** FSW Specific */
                FATAL: '#ff0000',
                WARNING_HI: '#ff7f24',
                WARNING_LO: '#ffff00',
                COMMAND: '#00bfff',
                ACTIVITY_HI: '#6d6d6d',
                ACTIVITY_LO: '#dcdcdc',
                DIAGNOSTIC: '#00ff00',
                EVR_UNKNOWN: '#00ff00',

                /** SSE Specific */
                FAULT: '#ff0000',
                WARNING: '#ff7f24'
              },

              /**
               * evrForegroundColorByLevel: specify the foreground color of EVRs
               * by level.  If a level is not defined here, it will use the
               * default specified above. Keys are specific EVR levels, and values
               * must be a a hex string for an RGB color, e.g. `#ababab`.
               */

              evrForegroundColorByLevel: {
                /** FSW Specific */
                FATAL: '#ffffff',
                WARNING_HI: '#000000',
                WARNING_LO: '#000000',
                COMMAND: '#ffffff',
                ACTIVITY_HI: '#ffffff',
                ACTIVITY_LO: '#000000',
                DIAGNOSTIC: '#000000',
                EVR_UNKNOWN: '#000000',

                /** SSE Specific */
                FAULT: '#ffffff',
                WARNING: '#000000'
              }
        },

        /**
         * Settings for time APIs and formats.
         */
        time: {
            /**
             * Default conductor mode.  Available options:
             *
             * * 'fixed' : fixed time bounds.
             * * 'utc.local' : follow local utc clock. Only available when
             *                 allowRealtime is true and scet or ert timeSystems
             *                 are available.
             * * 'scet.lad' : follow latest scet seen in telemetry data.  Only
             *                available when allowLAD is true and scet
             *                timeSystem is enabled.
             * * 'ert.lad' : follow latest ert seen in telemetry data.  Only
             *               available when allowLAD is true and ert
             *               timeSystem is enabled.
             * * 'sclk.lad' : follow latest sclk seen in telemetry data.  Only
             *                available when allowLAD is true and sclk
             *                timeSystem is enabled.
             * * 'msl.sol.lad' : follow latest mslsol seen in telemetry data.  Only
             *                  available when allowLAD is true and mslsol
             *                  timeSystem is enabled.
             */
            defaultMode: 'fixed',

            /**
             * utcFormat: available options
             *
             * * 'utc.day-of-year': 2015-015T12:34:56.999
             * * 'utc' : 2015-01-15T12:34:56.999
             */
            utcFormat: 'utc.day-of-year',


            /**
             * optional
             *
             * lmstEpoch: Epoch date for LMST Time System
             *
             * It has to be a Date.UTC instance as follows:
             *   lmstEpoch: Date.UTC(2020, 2, 18, 0, 0, 0)
             */
            lmstEpoch: Date.UTC(2020, 2, 18, 0, 0, 0),

            /**
             * timeSystems: specify the time systems to use.
             * Options are 'scet', 'ert', 'sclk', 'msl.sol' and 'lmst'.
             */
            timeSystems: [
                'scet',
                'ert'
            ],

            /**
             * timeSystems advanced configuration: 
             * Replace the above basic configuration with timeSystem specific configurations
             *
             * key property is required and other options are optional
             * timeSystem:
             * * key: string, required. Time system. Options are 'scet', 'ert', 'sclk', 'msl.sol' and 'lmst'.
             * * limit: number, optional - maximum duration between start and end bounds allow
             * * modeSettings: object, optional - presets for convenience. 
             * * * fixed: object, optional - valid objects are bounds objects and presets array. 
             * * * realtime: object, optional - valid objects are clockOffsets and presets array. 
             * * * lad:object, optional - valid objects are clockoffsets. 
             * * * * 
             * * * * Optional objects: 
             * * * * bounds: start and end bounds for preset as numbers
             * * * * * * * * start: and end: can be declared as a number or a function returning a number
             * * * * presets: array of objects consisting of: 
             * * * * * bounds: - required. 
             * * * * * label: - required, string
             * * * * clockOffsets: object, optional. Start and end relative to active clock. 
             * * * * start: and end: numbers relative to active clock's 0. Start is negative, end is positive. 
             * *advanced** example configuration below 
             
            timeSystems: [
             {
                key:'scet',
                modeSettings:{
                  fixed:{
                    bounds:{
                            start: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 2)).setUTCHours(0, 0, 0, 0),
                            end: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).setUTCHours(23,59, 59, 999)                       
                            },
                    presets:[
                      {
                        label: 'Last 2 hours (SCET Recorded)',
                        bounds: {
                            start: Date.now() - 1000 * 60 * 60 * 2,
                            end: Date.now()
                        }
                      },
                    ]
                  },
                  realtime:{
                    clockOffsets:{
                      start: -60 * 60 * 1000,
                      end: 5 * 60 * 1000
                    },
                    presets:[
                      {
                        label: 'Last 2 hours (SCET Realtime)',
                        bounds: {
                            start: -60 * 60 * 1000,
                            end: 5 * 60 * 1000
                        }
                      }
                    ]
                  },
                  lad:{
                    clockOffsets:{
                      start: -60 * 60 * 1000,
                      end: 5 * 60 * 1000
                    },
                  },
              },
                limit: 1000 * 60 * 60 * 60
            },
            {
              key:'ert',
              modeSettings:{
                fixed:{
                  bounds:{
                          start: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 4)).setUTCHours(0, 0, 0, 0),
                          end: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).setUTCHours(23,59, 59, 999)                       
                          },
                  presets:[
                    {
                      label: 'Last 2 hours (ERT Recorded)',
                      bounds: {
                          start: Date.now() - 1000 * 60 * 60 * 2,
                          end: Date.now()
                      }
                    },
                  ]
                },
                realtime:{
                  clockOffsets:{
                    start: -60 * 60 * 1000,
                    end: 5 * 60 * 1000
                  },
                  presets:[
                    {
                      label: 'Last 2 hours (ERT Realtime)',
                      bounds: {
                          start: -60 * 60 * 1000,
                          end: 5 * 60 * 1000
                      }
                    }
                  ]
                },
                lad:{
                  clockOffsets:{
                    start: -60 * 60 * 1000,
                    end: 5 * 60 * 1000
                  },
                },
            },
              limit: 1000 * 60 * 60 * 60
           }
          ],
            */
            /**
             * allowRealtime: whether or not to allow utc-relative time conductor.
             */
            allowRealtime: true,
            /**
             * allowLAD: whether or not to allow latest data relative time conductor. 
             * 
             * Note: allowRealtime must be true to use this option
             */
            allowLAD: true,
            /**
             * records: number of previous bounds per timeSystem to save in time conductor history.
             */
            records: 10
        },

        /**
         * Data Product Temporary Workaround:
         *
         * If you want to view real-time product data, you must specify all
         * product APIDs that you want to see in the below array.  This config
         * is only required for MCWS R3.2, and will not be required for
         * MCWS R3.3.
         *
         * This list can be quickly extracted from apid.xml with the following
         * python code:
         *
         * import xml.etree.ElementTree as ET
         * tree = ET.parse('apid.xml')
         * apids = [int(a.attrib['number']) for a in tree.getroot() if a.tag == 'apid']
         *
         */
        realtimeProductAPIDs: [],

        /**
         * Plugin Support: true enables a plugin.
         */
        plugins: {
            /**
             * Enable/disable summary widgets.  Added in R3.4.0.
             */
            summaryWidgets: true
        },

        /**
         * maxResults: a maximum results limit for historical queries
         */
        // maxResults: 10000,


        /**
         * sessionHistoricalMaxResults: a maximum results limit for historical session queries
         */
        sessionHistoricalMaxResults: 100,

        /**
         * batchHistoricalChannelQueries: default false
         * set to true to batch channel historical queries in telemetry tables
         * 
         * USE WITH CAUTION
         * You can more easily overwhelm the backend with a larger single query
         */
        batchHistoricalChannelQueries: false,

        /**
         * enable to not send sort param in historical queries
         * only set this configuration to true if you are certain you wish to disable backend sort
         */
        disableSortParam: false,

        /**
         * Url used to listen to message stream for StartOfSession and
         * EndOfSession messages
         */
        messageStreamUrl: '',

        /**
         * Use to set mission specific filters on messages by message type
         *
         * Filter Object Properties:
         * * value: string, message type code value
         * * label: string, user-visible label for identifying this filter option
         */
        messageTypeFilters: [
            /**
             * {value: 'LossOfSync', label: 'Loss of Sync'},
             * ...
             * {value: 'InSync', label: 'In Sync'}
             */
        ],

        /**
         * Use to set up expected VCID's in the frame event stream.
         * Frame Accountability View will highlight the unexpected VC's in orange.
         */
        frameAccountabilityExpectedVcidList: [
            /** 
             * 234223,
             * 234234,
             * 223423
            */
        ],

        /**
         * Use to warn the user and block historical query when the ert, scet or lmst based time-conductor timespan exceeds set limits
         * units - milliseconds
         * !!when set to undefined, user will not be warned and queries will not be blocked
         */
        queryTimespanLimit: undefined,

        /**
         * Time since last received realtime datum. 
         * Any datum that is received after the set timespan will have a stale (isStale) property set.
         * units - milliseconds
         * !!when set to undefined, there will be no global staleness timespan set.
         */
        globalStalenessInterval: undefined,

        /**
         * Register custom formatters for use in Telemetry View in Display Layout's
         * Custom Formatters need to be an object with a unique String "key" property
         * and a "format" function that accepts a value and returns formatted value
         * 
         * Custom formatters can be accessed in Display Layout's format inspector view,
         * with a pre-pended '&', e.g the 'hello-world' formatter can be accessed by '&hello-world'
         */
        customFormatters: [
            /**
             * {
                    key: 'hello-world',
                    format: (value) => {
                        return `hello-world: ${value}`;
                    }
                }
             */
            
        ],

        /**
         * Use to set deployment specific session configuration
         *
         * historicalSessionFilter Object Properties:
         * * disable: Boolean, to disable historical session filtering
         * * maxRecords: Number, a number greater than 0, for maximum historical session records to be returned
         * 
         * realtimeSession Object Properties:
         * * disable: Boolean, to disable realtime sessions. Note - this will disable all websocket connections
         */
        sessions: {
            historicalSessionFilter: {
                disable: false,
                maxRecords: 100,
                denyUnfilteredQueries: false
            },
            realtimeSession: {
                disable: false
            }
        },

        /**
         * Enable global filters for ALL telemetry requests that support the filter. 
         * Telemetry filters modify the 'filter' field in queries to MCWS. 
         * 
         * key property is required and other options are optional
         * globalFilters: array, optional - list of global filters to configure. 
         * * key: string, required. Filter column, e.g. vcid
         * * name: string, required. Identifier of the filter in the selection window. 
         * * icon: 'icon-flag', string, icon. Not implemented - potentially icon for minimized filter list. 
         * * filter: object, required. Filter object to implement 
         * * * comparator: string, required. currently supports 'equals'
         * * * singleSelectionThreshold: boolean, required. currently supports true only. 
         * * * defaultLabel: string, optional. Defaults to 'None'. Label to show if filter inactive.  
         * * * possibleValues: array, required. List of values and labels for filter. 
         * * * * label: string, required. Label to show in filter selection dropdown. 
         * * * * value: string, required. value to set parameter to in filtered query. 
         * How to use:
         * The global filters will be available from the Global Filters indicator. 
         * Enable a filter by selecting the desired filter from the dropdown and hitting update. 
         * Outgoing requests that use the 'filter' parameter to MCWS will be modified with your filter. 
         * example below, selecting 'A side' will ensure that the filter parameter in mcws includes: 
         * vcid='1,2,3'. Note that poorly formatted filters may not pass MCWS API validation. 
         *  
        */
        /*
        globalFilters: [
          {
            name: 'VCID',
            key: 'vcid',
            icon: 'icon-flag',
            filter: {
              comparator: 'equals',
              singleSelectionThreshold: true,
              defaultLabel: "A & B",
              possibleValues: [
                {
                  label: 'A Side',
                  value: '1,2,3'
                },
                {
                  label: 'B Side',
                  value: '4,5,6'
                }
              ]
            }
          },
          {
            name: 'Realtime',
            key: 'realtime',
            filter: {
              comparator: 'equals',
              singleSelectionThreshold: true,
              defaultLabel: "REC & RLT",
              possibleValues: [
                {
                  label: 'Realtime',
                  value: true
                },
                {
                  label: 'Recorded',
                  value: false
                }
              ]
            }
          }
        ],
        */
        /**
         * Table Performance Mode Configuration
         * Can increase performance by limiting the maximum rows retained and displayed by tables
         * Affects all bounded table types such as Telemetry and EVR tables
         * Does not affect latest available tables such as Channel tables
         * @typedef TablePerformanceOptions
         * @type {object}
         * @property {('performance'|'unlimited')} telemetryMode performance mode limits the maximum table rows
         * @property {Boolean} persistModeChange whether changes in the UI are persisted with the table
         * @property {Number} rowLimit the maximum number of rows in performance mode
         */
        tablePerformanceOptions: {
          telemetryMode: 'unlimited',
          persistModeChange: false,
          rowLimit: 50
        },
        /**
         * Developer Settings-- do not modify these unless you know what
         * they do!
         */
        assetPath: 'node_modules/openmct/dist',
        // proxyUrl: 'http://localhost:8080/',
        // useDeveloperStorage: true
    };

    window.openmctMCWSConfig = openmctMCWSConfig;
})();
