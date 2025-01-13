import SessionSelectorController from '../SessionSelectorController';

// this would be better tested in an e2e test
xdescribe('SessionSelectorController', function () {
    let $scope;
    let sessionService;
    let controller;

    beforeEach(function () {
        $scope = jasmine.createSpyObj('$scope', ['$digest']);
        $scope.ngModel = {
            dismiss: jasmine.createSpy('dismiss')
        };

        sessionService = jasmine.createSpyObj(
            'sessionService',
            [
                'setActiveTopicOrSession',
                'isActiveTopic',
                'isActiveSession',
                'getTopicsWithSessions'
            ]
        );

        sessionService.isActiveTopic.and.returnValue(false);
        sessionService.isActiveSession.and.returnValue(false);

        sessionService.getTopicsWithSessions.and.returnValue(Promise.resolve([
            {
                topic: 'AMPCS.a',
                jms_subtopic: 'a',
                sessions: [
                    {
                        number: 1,
                        topic: 'AMPCS.a',
                        jms_subtopic: 'a',
                    },
                    {
                        number: 2,
                        topic: 'AMPCS.a',
                        jms_subtopic: 'a',
                    }
                ]
            },
            {
                topic: 'AMPCS.b',
                jms_subtopic: 'b',
                sessions: []
            }
        ]));
    });

    describe('instantiation', function () {
        beforeEach(function () {
            controller = new SessionSelectorController($scope, sessionService);
        });

        it('sets scope variables', function () {
            expect($scope.selection).toBeUndefined();
            expect($scope.topics.length).toBe(0);
        });

        it('immediately starts loading sessions', function () {
            expect($scope.loading).toBe(true);
            expect(sessionService.getTopicsWithSessions).toHaveBeenCalled();
        });
    });

    describe('after loading', function () {
        beforeEach(function (done) {
            $scope.$digest.and.callFake(done);
            controller = new SessionSelectorController($scope, sessionService);
        });

        it('is no longer loading', function () {
            expect($scope.loading).toBe(false);
        });

        it('has populated topics', function () {
            expect($scope.topics.length).toBe(2);
            expect($scope.topics).toContain({
                selected: false,
                expanded: false,
                data: {
                    topic: 'AMPCS.a',
                    jms_subtopic: 'a',
                    sessions: jasmine.any(Array)
                },
                sessions: [
                    {
                        selected: false,
                        data: {
                            topic: 'AMPCS.a',
                            jms_subtopic: 'a',
                            number: 1
                        }
                    },
                    {
                        selected: false,
                        data: {
                            topic: 'AMPCS.a',
                            jms_subtopic: 'a',
                            number: 2
                        }
                    }
                ]
            });

            expect($scope.topics).toContain({
                selected: false,
                expanded: false,
                data: {
                    topic: 'AMPCS.b',
                    jms_subtopic: 'b',
                    sessions: []
                },
                sessions: []
            });
        });

        it('does not have a selection', function () {
            expect($scope.selection).toBeUndefined();
        });
    });

    describe('loading with selected topic', function () {
        beforeEach(function (done) {
            $scope.$digest.and.callFake(done);
            sessionService
                .isActiveTopic
                .and.callFake(function (model) {
                    return model.topic === 'AMPCS.b' && !model.number;
                });
            controller = new SessionSelectorController($scope, sessionService);
        });

        it('has a selection', function () {
            expect($scope.selection).toBeDefined();
            expect($scope.selection).toEqual({
                selected: true,
                expanded: false,
                data: {
                    topic: 'AMPCS.b',
                    jms_subtopic: 'b',
                    sessions: []
                },
                sessions: []
            });
            expect($scope.selection).toBe($scope.topics[1]);
        });
    });

    describe('loading with selected session', function () {
        beforeEach(function (done) {
            $scope.$digest.and.callFake(done);
            sessionService
                .isActiveSession
                .and.callFake(function (model) {
                    return model.topic === 'AMPCS.a' &&
                        model.number === 2;
                });
            controller = new SessionSelectorController($scope, sessionService);
        });

        it('has a selection', function () {
            expect($scope.selection).toBeDefined();
            expect($scope.selection).toEqual({
                selected: true,
                data: {
                    topic: 'AMPCS.a',
                    jms_subtopic: 'a',
                    number: 2
                }
            });
            expect($scope.selection).toBe($scope.topics[0].sessions[1]);
        });

        it('expands the containing topic', function () {
            expect($scope.topics[0].expanded).toBe(true);
        });
    });

    describe('selecting a session', function () {
        beforeEach(function (done) {
            $scope.$digest.and.callFake(() => {
                controller.select($scope.topics[0].sessions[0]);
                done();
            });
            controller = new SessionSelectorController($scope, sessionService);
        });

        it('marks the session as selected', function () {
            expect($scope.selection).toBe($scope.topics[0].sessions[0]);
            expect($scope.selection.selected).toBe(true);
        });

        it('deselects when selecting a different session', function () {
            controller.select($scope.topics[0].sessions[1]);
            expect($scope.selection).toBe($scope.topics[0].sessions[1]);
            expect($scope.selection.selected).toBe(true);
            expect($scope.topics[0].sessions[0].selected).toBe(false);
        });

        it('deselects when selecting a topic', function () {
            controller.select($scope.topics[0]);
            expect($scope.selection).toBe($scope.topics[0]);
            expect($scope.selection.selected).toBe(true);
            expect($scope.topics[0].sessions[0].selected).toBe(false);
        });

        it('changes active topic when confirmed', function () {
            controller.confirm();
            expect(sessionService.setActiveTopicOrSession)
                .toHaveBeenCalledWith($scope.selection.data);
            expect($scope.ngModel.dismiss).toHaveBeenCalled();
        });

        it('does not change active topic when canceled', function () {
            controller.cancel();
            expect(sessionService.setActiveTopicOrSession)
                .not
                .toHaveBeenCalled();
            expect($scope.ngModel.dismiss).toHaveBeenCalled();
        });
    });

    describe('selecting a topic', function () {
        beforeEach(function (done) {
            $scope.$digest.and.callFake(() => {
                controller.select($scope.topics[0]);
                done();
            });
            controller = new SessionSelectorController($scope, sessionService);
        });

        it('marks the topic as selected', function () {
            expect($scope.selection).toBe($scope.topics[0]);
            expect($scope.selection.selected).toBe(true);
        });

        it('deselects when selecting a different session', function () {
            controller.select($scope.topics[0].sessions[1]);
            expect($scope.selection).toBe($scope.topics[0].sessions[1]);
            expect($scope.selection.selected).toBe(true);
            expect($scope.topics[0].selected).toBe(false);
        });

        it('deselects when selecting a different topic', function () {
            controller.select($scope.topics[1]);
            expect($scope.selection).toBe($scope.topics[1]);
            expect($scope.selection.selected).toBe(true);
            expect($scope.topics[0].selected).toBe(false);
        });

        it('changes active topic when confirmed', function () {
            controller.confirm();
            expect(sessionService.setActiveTopicOrSession)
                .toHaveBeenCalledWith($scope.selection.data);
            expect($scope.ngModel.dismiss).toHaveBeenCalled();
        });

        it('does not change active topic when canceled', function () {
            controller.cancel();
            expect(sessionService.setActiveTopicOrSession)
                .not
                .toHaveBeenCalled();
            expect($scope.ngModel.dismiss).toHaveBeenCalled();
        });
    });
});
