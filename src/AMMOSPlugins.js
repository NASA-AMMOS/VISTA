define([
    'services/dataset/DatasetCache',
    'services/session/SessionService',
    'services/globalStaleness/globalStaleness',
    './types/plugin',
    './taxonomy/plugin',
    './time/plugin',
    'services/time/vistaTime',
    './identity/plugin',
    './historical/plugin',
    './realtime/plugin',
    './link/plugin',
    './formats/plugin',
    './venues/plugin',
    'services/mcws/MCWSClient',
    './formats/UTCDayOfYearFormat',
    './framesummary/plugin',
    './frameEventFilterView/plugin',
    './channelTable/channelTablePlugin/plugin',
    './channelTable/channelTableSetPlugin/plugin',
    './channelLimits/plugin',
    './frameaccountability/plugin',
    './alarmsView/plugin',
    './messageStreamProcessor/plugin',
    './evrView/plugin',
    './customFormatter/plugin',
    './customForms/plugin',
    './actionModifiers/plugin',
    './realtimeIndicator/plugin',
    './packetQuery/plugin',
    './mcwsIndicator/plugin',
    './multipleHistoricalSessions/plugin',
    './realtimeSessions/plugin',
    './globalFilters/plugin'
], function (
    DatasetCache,
    SessionService,
    GlobalStaleness,
    TypePlugin,
    TaxonomyPlugin,
    TimePlugin,
    getVistaTime,
    IdentityPlugin,
    HistoricalTelemetryPlugin,
    RealtimeTelemetryPlugin,
    LinkPlugin,
    FormatPlugin,
    VenuePlugin,
    mcwsClient,
    UTCDayOfYearFormat,
    FrameWatchViewPlugin,
    FrameEventFilterViewPlugin,
    ChannelTablePlugin,
    ChannelTableSetPlugin,
    ChannelLimitsPlugin,
    FrameAccountabilityPlugin,
    AlarmsViewPlugin,
    MessageStreamProcessor,
    EVRViewPlugin,
    CustomFormatterPlugin,
    CustomFormsPlugin,
    ActionModifiersPlugin,
    RealtimeIndicatorPlugin,
    PacketQueryPlugin,
    MCWSIndicatorPlugin,
    MultipleHistoricalSessions,
    RealtimeSessions,
    GlobalFilters
) {

    function AMMOSPlugins(options) {
        return function install(openmct) {
            // initialze session service, datasetCache service, global staleness
            SessionService.default(openmct, options);
            DatasetCache.default(openmct);
            GlobalStaleness.default(openmct, window.openmctMCWSConfig.globalStalenessInterval);

            openmct.install(new FormatPlugin(options));

            const timePlugin = new TimePlugin(openmct, options.time);
            openmct.install(timePlugin);

            const formatKey = options.time.utcFormat;
            const utcFormat = formatKey
                ? openmct.telemetry.getFormatter(formatKey)
                : new UTCDayOfYearFormat.default();
            const vistaTime = getVistaTime.default({
                options: timePlugin,
                format: utcFormat
            });
            openmct.install(RealtimeIndicatorPlugin.default(vistaTime));

            const identityPlugin = new IdentityPlugin(options);
            openmct.install(identityPlugin);

            mcwsClient.default.configure(options, identityPlugin.login);

            openmct.install(MultipleHistoricalSessions.default());
            openmct.install(RealtimeSessions.default());

            openmct.install(new HistoricalTelemetryPlugin(options));
            openmct.install(new RealtimeTelemetryPlugin(vistaTime, options));
            openmct.install(new TypePlugin(options));
            openmct.install(new TaxonomyPlugin(options.taxonomy));
            openmct.install(new LinkPlugin(options));
            openmct.install(new VenuePlugin(options));
            openmct.install(FrameWatchViewPlugin.default());
            openmct.install(FrameEventFilterViewPlugin.default());
            openmct.install(new ChannelTablePlugin.default());
            openmct.install(new ChannelTableSetPlugin.default());
            openmct.install(new ChannelLimitsPlugin.default());
            openmct.install(new FrameAccountabilityPlugin.default(options.frameAccountabilityExpectedVcidList));
            openmct.install(EVRViewPlugin.default(options.taxonomy));
            openmct.install(new AlarmsViewPlugin.default());
            openmct.install(MCWSIndicatorPlugin.default());
            
            if (window.openmctMCWSConfig.messageStreamUrl && window.openmctMCWSConfig.messageStreamUrl !== '') {
                openmct.install(new MessageStreamProcessor(
                    window.openmctMCWSConfig.messageStreamUrl,
                    {
                        clearData: ['StartOfSession', 'EndOfSession'],
                        suspectChannels: ['SuspectChannels']
                    }
                ));
            }

            if (options.customFormatters.length) {
                openmct.install(CustomFormatterPlugin.default(options.customFormatters));
            }

            openmct.install(CustomFormsPlugin.default());

            openmct.install(openmct.plugins.DefaultRootName('VISTA'));
            openmct.install(ActionModifiersPlugin.default());
            openmct.install(new PacketQueryPlugin.default());
            if (options.globalFilters) {
              openmct.install(new GlobalFilters.default(options.globalFilters));
            }
        };
    }

    return AMMOSPlugins;
});
