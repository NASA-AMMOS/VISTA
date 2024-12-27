import mcws from 'services/mcws/mcws';
import DatasetCache from 'services/dataset/DatasetCache';
import SessionURLHandler from './SessionURLHandler';
import SessionLocalStorageHander from './SessionLocalStorageHandler';

const ERROR_PREFIX = 'Error when notifying listener: ';

/**
 * AMPCS topic - {root_topic}[.{jms_subtopic}]
 * root_topic - mpcs.{mission_name}.{venue/hostname}
 * venue - [ops, testbed, atlo]
 */

/**
 * Represents a session. Contains all properties that would be returned as
 * a row of a session datatable, the full set is not documented here.
 *
 * @typedef {Object} Session
 * @property {Integer} number standard datatable field
 * @property {String} topic standard datatable field (a full AMPCS topic)
 * @property {String} jms_subtopic standard datatable field (not used in Open MCT)
 */

/**
 * Represents a topic, and any sessions defined within that topic. Contains
 * all properties that would be returned as a row of a session datatable,
 * the full set is not documented here.
 *
 * @typedef {Object} Topic
 * @property {String} topic standard datatable field (a full AMPCS topic)
 * @property {String} jms_subtopic standard datatable field (not used in Open MCT)
 * @property {Session[]} sessions all sessions available for this topic.
 */

/**
 * Fetches topics and their sessions from mcws.  Also handles setting and
 * returning the active topic and/or session.
 *
 * @param datasetCache
 * @param openmct
 */

class SessionService {
    constructor(openmct, openmctMCWSConfig) {
        this.openmct = openmct;
        this.datasetCache = null;

        this.subscriptions = {
            session: [],
            historical: []
        };
        this.activeModel = undefined;
        this.historicalSessionFilter = undefined;
        this.sessionConfig = openmctMCWSConfig.sessions;
        this.realtimeSessionConfig = this.sessionConfig.realtimeSession;
        this.historicalSessionFilterConfig = this.sessionConfig.historicalSessionFilter;
        this.notificationService = openmct.notifications;
        this.camErrorDialogActive = false;

        // these need to be run in this order
        openmct.on('start', () => {
            new SessionURLHandler(this, openmct);
            new SessionLocalStorageHander(this);

            this.pollForActiveSession();
        });
    }

    /**
     * Allows callbacks to be registered for changes to the active topic or
     * session.  Registration returns an unsubscribe function.
     *
     * @param {Function} callback, invoked with the currently `activeSession`
     *     whenever the session changes.  May be called with `undefined` if no
     *     session is selected.
     * @returns {Function} unsubscribe function, invoke to remove listener.
     */
    listen(callback) {
        this.subscriptions.session.push(callback);

        return () => {
            this.subscriptions.session = this.subscriptions.session.filter((cb) => {
                return cb !== callback;
            });
        };
    };

    getDatasets() {
        if (this.datasetCache) {
            return this.datasetCache.datasets;
        }

        this.datasetCache = DatasetCache();

        return this.datasetCache.datasets;
    }

    listenForHistoricalChange(callback) {
        this.subscriptions.historical.push(callback);

        return () => {
            this.subscriptions.historical = this.subscriptions.historical.filter((cb) => {
                return cb !== callback;
            });
        };
    };

    /**
     * @returns {Object} the currently active topic or session.  May return
     *     undefined if no topic or session is active.
     */
    getActiveTopicOrSession() {
        return this.activeModel;
    };

    /**
     * Changes the active model to the one supplied, and broadcasts the
     * the new model to all listeners if it is different than the previous
     * model.
     *
     * @param {Object} model a topic or session model to be set as the active
     *     connection.  Call with `undefined` to clear the active topic/session.
     */
    setActiveTopicOrSession(model) {
        if (this.realtimeSessionConfig.disable) {
            this.notificationService.alert('Realtime Sessions have been disabled in config');
            return;
        }

        if (!this.isActiveTopic(model) || !this.isActiveSession(model)) {
            const currentTime = new Date().toISOString();

            this.activeModel = model;
            this.subscriptions.session.forEach((listener) => {
                try {
                    listener(model);
                } catch (error) {
                    console.error(`${ERROR_PREFIX}${error.message}`);
                    console.error(error);
                }
            });

            if (model) {
                this.notificationService.info('Connected to realtime from ' + model.topic);
                console.log(`Connected to realtime from ${model.topic}. ${currentTime} wall clock time.`);
            } else {
                this.notificationService.info('Disconnected from realtime');
                console.log(`Disconnected from realtime. ${currentTime} wall clock time.`);
            }
        }
    };

    /**
     * @param {Object} model a topic model, or undefined.
     * @returns boolean true if the supplies topic is the currently
     *     active topic or session.
     */
    isActiveTopic(model) {
        if (this.activeModel === undefined || model === undefined) {
            return false;
        }

        return this.activeModel.topic === model.topic;
    };

    /**
     * @returns boolean true if a topic/session is active, otherwise false.
     */
    hasActiveTopicOrSession() {
        return Boolean(this.activeModel);
    };

    showCamTimeoutError(error) {
        if (this.camErrorDialogActive) {
            return;
        }

        this.camErrorDialogActive = true;
        
        const currentTime = new Date().toISOString();
        const noActiveSessionMessage = `Poll for active session failed at ${currentTime} wall clock time. This may indicate a CAM timeout or session connection issue, which could result in data loss. Refresh if data does not appear to be flowing.`;

        console.warn(noActiveSessionMessage);
        console.warn(error);

        const dialog = this.openmct.overlays.dialog({
            iconClass: 'alert',
            message: noActiveSessionMessage,
            buttons: [
                {
                    label: 'Cancel',
                    callback: () => {
                        dialog.dismiss();
                        this.camErrorDialogActive = false;
                    }
                },
                {
                    label: 'Refresh',
                    emphasis: true,
                    callback() {
                        dialog.dismiss();
                        window.location.reload();
                    }
                }
            ]
        });
    };

    async getActiveSessions(sessionLADUrl) {
        let sessions = [];

        try {
            sessions = await mcws.dataTable(sessionLADUrl).read();
        } catch (error) {
            this.showCamTimeoutError(error);
        }

        const sessionsByTopic = {};
        sessions.forEach((session) => {
            if (sessionsByTopic[session.topic] === undefined) {
                sessionsByTopic[session.topic] = [];
            }

            sessionsByTopic[session.topic].push(session);
        });

        // for each topic, remove 'number' property from the first session object in the topic as the base topic object
        const topics = Object.keys(sessionsByTopic).map((topic) => {
            const topicObj = { ...sessionsByTopic[topic][0] };
            delete topicObj.number;

            // filter out sessions without a 'number' property and add them to the topic object sessions
            topicObj.sessions = sessionsByTopic[topic].filter((session) => session.number);

            return topicObj;
        });

        return topics;
    }

    /**
     * Get available topics with sessions.
     *
     * @returns {Promise.<Topic[]>}
     */
    async getTopicsWithSessions() {
        if (this.realtimeSessionConfig.disable) {
            return Promise.resolve([]);
        }

        const datasets = Object.values(this.getDatasets());
        const validUrls = datasets.map(dataset => dataset.options.sessionLADUrl).filter(url => url);
        const sessionLADUrls = validUrls.reduce((uniqueUrls, url) => {
            return uniqueUrls.includes(url) ? uniqueUrls : [...uniqueUrls, url];
        }, []);
        const topicsWithSessions = await Promise.all(sessionLADUrls.map(url => this.getActiveSessions(url)));

        return topicsWithSessions.flat();
    };

    makeMCWSFilters(filters) {
        if (!filters) {
            return {};
        }

        const filterKeys = Object.keys(filters);

        return filterKeys.reduce((mcwsFilters, filterKey) => {
            if (filters[filterKey]) {
                if (filterKey === 'number') { // Filter for exact match
                    mcwsFilters[filterKey] = filters[filterKey];
                } else { // Filter for wildcard match.
                    mcwsFilters[filterKey] = '*' + filters[filterKey] + '*';
                }
            }

            return mcwsFilters;
        }, {});
    };

    async getHistoricalSessionsByUrl(url, filters) {
        const max_records = this.historicalSessionFilterConfig.maxRecords || 100;
        const filter = this.makeMCWSFilters(filters);
        const sort = '-number:numeric';
        let sessions = [];
        
        try {
            sessions = await mcws.dataTable(url).read({
                max_records,
                filter,
                sort
            });
        } catch (error) {
            this.notificationService.alert("A dataset with an invalid session URL is configured: " + url);
            console.warn(error);
        }
        
        return sessions;
    };

    async getHistoricalSessions(filters, urls) {
        if (this.historicalSessionFilterConfig.disable) {
            return Promise.resolve([]);
        }

        let sessionUrls = urls;

        if (arguments.length === 1) {
            const datasets = Object.values(this.getDatasets());
            const validUrls = datasets.map(dataset => dataset.options.sessionUrl).filter(url => url);
            sessionUrls = validUrls.reduce((uniqueUrls, url) => {
                return uniqueUrls.includes(url) ? uniqueUrls : [...uniqueUrls, url];
            }, []);
        }

        const sessionRequests = sessionUrls.map((sessionUrl) => this.getHistoricalSessionsByUrl(sessionUrl, filters));
        const uniqueSessionsMap = [];
        let historicalSessions = await Promise.all(sessionRequests);

        historicalSessions = historicalSessions.flat();
        historicalSessions = historicalSessions.reduce((uniqueSessions, session) => {
            const sessionId = session.number + session.host;

            if (!uniqueSessionsMap.includes(sessionId)) {
                uniqueSessionsMap.push(sessionId);
                uniqueSessions = [...uniqueSessions, session];
            }

            return uniqueSessions;
        }, []);

        return historicalSessions;
    };

    getHistoricalSessionFilter() {
        return this.historicalSessionFilter;
    };

    /**
     * @returns boolean true if a historical session filtering is active, otherwise false.
     */
    hasHistoricalSessionFilter() {
        return Boolean(this.historicalSessionFilter);
    };

    setHistoricalSessionFilter(model) {
        if (this.historicalSessionFilterConfig.disable) {
            this.notificationService.alert('Historical Session Filtering has been disabled in config');

            return;
        }

        this.historicalSessionFilter = model;
        this.subscriptions.historical.forEach((listener) => {
            try {
                listener(model);
            } catch (error) {
                console.error(`${ERROR_PREFIX}${error.message}`);
                console.error(error);
            }
        });

        this.notifyUserOfHistoricalSessionFilterChange(model);
        
        //clear plots and tables before requery
        this.openmct.objectViews.emit('clearData');

        let boundsChanged = false;

        if (
            model?.start_time
            && model?.end_time
            && this.openmct.time.timeSystem().key === 'ert'
            && !this.openmct.time.clock()
        ) {
            const format = this.openmct.telemetry.getFormatter('utc.day-of-year');
            const start = format.parse(model.start_time);
            let end = format.parse(model.end_time);
            
            if (start === end) {
                end = format.endOfDay(end);
            }

            this.openmct.time.bounds({
                start,
                end
            });
            
            boundsChanged = true;
        }

        if (!boundsChanged) {
            //force a bounds change to trigger a requery for views
            this.openmct.time.bounds(this.openmct.time.bounds());
        }
    };

    notifyUserOfHistoricalSessionFilterChange(model) {
        let notificationString = 'Historical queries not restricted by session.';

        if (model) {
            notificationString = `Historical queries restricted to ${model.numbers.length} ${model.numbers.length > 1 ? 'session\'s' : 'session'} on ${model.host}.`;
        }

        this.notificationService.info(notificationString);
    };

    sessionOrTopic(model) {
        return model.number ? 'session' : 'topic';
    };

    isActiveSession(model) {
        if (!this.activeModel) {
            
            return false;
        }

        if (this.activeModel.topic === model.topic && this.activeModel.number == model.number) {

            return true;
        }
            
        return false;
    };

    pollForActiveSession() {
        if (this.realtimeSessionConfig.disable) {
            return;
        }

        const pollInterval = 5000;
        let activelyPolling = false;

        window.setInterval(async () => {
            if (!this.activeModel || activelyPolling) {
                return;
            }

            activelyPolling = true;

            try {
                const topics = await this.getTopicsWithSessions();
                const sessionOrTopic = this.sessionOrTopic(this.activeModel);

                if (sessionOrTopic === 'session') {
                    const sessions = topics.map((t) => t.sessions).flat();

                    if (!sessions.some(this.isActiveSession.bind(this))) {
                        //disconnect from non-available session
                        this.setActiveTopicOrSession();
                    }
                } else if (!topics.some(this.isActiveTopic.bind(this))) {
                    //disconnect from non-available topic
                    this.setActiveTopicOrSession();
                }
            } finally {
                activelyPolling = false;
            }
        }, pollInterval);
    };

}

let sessionServiceInstance = null;

export default function(openmct, openmctMCWSConfig) {
    if (!sessionServiceInstance) {
        sessionServiceInstance = new SessionService(openmct, openmctMCWSConfig);
    }

    return sessionServiceInstance;
}
