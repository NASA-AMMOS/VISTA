import SessionIndicatorController from '../SessionIndicatorController';

// this would be better tested in an e2e test
xdescribe('SessionIndicatorController', function () {
    let $scope;
    let sessionService;
    let overlayService;
    let overlay;
    let $timeout;
    let instantiate;
    let controller;

    beforeEach(function () {
        $scope = jasmine.createSpyObj('$scope', ['$digest']);
        sessionService = jasmine.createSpyObj(
            'sessionService',
            [
                'setActiveTopicOrSession',
                'getActiveTopicOrSession',
                'getTopicsWithSessions',
                'listen'
            ]
        );
        sessionService.realtimeSessionConfig = {
            disable: false
        };
        sessionService.historicalSessionFilterConfig = {
            disable: false,
            maxRecords: 100
        }
        sessionService.getTopicsWithSessions.and.returnValue(Promise.resolve([]));
        sessionService.getActiveTopicOrSession.and.returnValue('mySession');
        overlayService = jasmine.createSpyObj(
            'overlayService',
            ['createOverlay']
        );
        overlay = jasmine.createSpyObj(
            'overlay',
            ['dismiss']
        );
        overlayService.createOverlay.and.returnValue(overlay);
        $timeout = jasmine.createSpy('$timeout');
        $timeout.cancel = jasmine.createSpy('timeout.cancel');

        spyOn(SessionIndicatorController.prototype, 'pollForSessions');

        controller = new SessionIndicatorController(
            $scope,
            sessionService,
            overlayService,
            $timeout
        );
    });

    it('polls for sessions on instantiation', function () {
        expect(controller.pollForSessions).toHaveBeenCalled();
    });

    it('sets activeSession on instantiation', function () {
        expect($scope.activeSession).toBe('mySession');
    });

    it('listens for and handles changes of active session', function () {
        var callsToPoll = controller.pollForSessions.calls.all().length;
        expect(sessionService.listen)
            .toHaveBeenCalledWith(jasmine.any(Function));

        sessionService.listen.calls.mostRecent().args[0]('anotherSession');
        expect($scope.activeSession).toBe('anotherSession');
        expect(controller.pollForSessions.calls.all().length)
            .toBe(callsToPoll + 1);
    });

    describe('pollForSessions', function () {
        beforeEach(function () {
            // instantiate without calls so we can test.
            controller.pollForSessions.calls.reset();
            controller.pollForSessions.and.callThrough();
        });

        it('sets a timeout to poll sessions', function () {
            controller.pollForSessions();
            expect($timeout)
                .toHaveBeenCalledWith(
                    jasmine.any(Function),
                    jasmine.any(Number)
                );

            expect(controller.pollForSessions.calls.all().length).toBe(1);
            $timeout.calls.mostRecent().args[0]();
            expect(controller.pollForSessions.calls.all().length).toBe(2);
        });

        it('does not fetch sessions with active session', function () {
            expect($scope.activeSession).toBe('mySession');
            controller.pollForSessions();
            expect(sessionService.getTopicsWithSessions)
                .not
                .toHaveBeenCalled();
        });

        describe('without active session', function () {
            let digestPromise;

            beforeEach(function (done) {
                digestPromise = new Promise((resolve, reject) => {
                    $scope.activeSession = undefined;
                    expect(typeof $scope.hasTopics).toBe('undefined');
                    expect(sessionService.getTopicsWithSessions)
                        .not
                        .toHaveBeenCalled();

                    $scope.$digest.and.callFake(resolve);
                    done();
                });
            });


            it('fetches sessions', function () {
                controller.pollForSessions();
                expect(sessionService.getTopicsWithSessions)
                    .toHaveBeenCalled();
                // Ensure async tasks finish before other specs.
                return digestPromise;
            });

            it('sets hasTopic to false when no topics exist', function () {
                sessionService
                    .getTopicsWithSessions
                    .and.returnValue(Promise.resolve([]));
                controller.pollForSessions();
                return digestPromise.then(() => {
                    expect($scope.hasTopics).toBe(false);
                });
            });

            it('sets hasTopic to true when topics exist', function () {
                sessionService
                    .getTopicsWithSessions
                    .and.returnValue(Promise.resolve([
                        'a',
                        'b'
                    ]));
                controller.pollForSessions();
                return digestPromise.then(() => {
                    expect($scope.hasTopics).toBe(true);
                });
            });

        });
    });

    describe('selectSession', function () {

        beforeEach(function () {
            controller.selectSession();
        });

        it('opens an overlay and provides dismiss function', function () {
            expect(overlayService.createOverlay).toHaveBeenCalledWith(
                'vista.sessionSelectorView',
                {
                    dismiss: jasmine.any(Function)
                }
            );
        });

        it('passes method to dismiss overlay to overlay', function () {
            var options = overlayService.createOverlay.calls.all()[0].args[1];
            expect(overlay.dismiss).not.toHaveBeenCalled();
            options.dismiss();
            expect(overlay.dismiss).toHaveBeenCalled();
        });
    });

    it('can disconnect the active stream', function () {
        controller.disconnect();
        expect(sessionService.setActiveTopicOrSession)
            .toHaveBeenCalledWith(undefined);
    });
});
