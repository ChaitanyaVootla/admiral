(function () {
  'use strict';

  admiral.controller('dashboardCtrl', ['$scope', '$stateParams', '$q', '$state',
    'admiralApiAdapter', 'horn',
    dashboardCtrl
  ])
  .config(['$stateProvider', 'SRC_PATH',
    function ($stateProvider, SRC_PATH) {
      $stateProvider.state('dashboard', {
        url: '/',
        templateUrl: SRC_PATH + 'dashboard/dashboard.html',
        controller: 'dashboardCtrl'
      });
    }
  ]);


  function dashboardCtrl($scope, $stateParams, $q, $state, admiralApiAdapter,
    horn) {
    var dashboardCtrlDefer = $q.defer();

    $scope._r.showCrumb = false;
    $scope.dashboardCtrlPromise = dashboardCtrlDefer.promise;

    $scope.vm = {
      isLoaded: false,
      initializing: false,
      initializeForm: {
        msgPassword: '',
        statePassword: '',
        accessKey: '',
        secretKey: ''
      },
      systemConfigs: {
        db: {
          displayName: 'Database',
          isInitialized: false
        },
        secrets: {
          displayName: 'Secrets'
        },
        msg: {
          displayName: 'Messaging'
        },
        state: {
          displayName: 'State'
        },
        redis: {
          displayName: 'Redis'
        }
      },
      selectedService: {},
      initialize: initialize,
      showConfigModal: showConfigModal,
      showLogModal: showLogModal,
      logOutOfAdmiral: logOutOfAdmiral
    };

    $scope._r.appPromise.then(initWorkflow);

    function initWorkflow() {
      var bag = {};

      async.series([
          setBreadcrumb.bind(null, bag),
          getSystemConfigs.bind(null, bag)
        ],
        function (err) {
          $scope.vm.isLoaded = true;
          if (err) {
            dashboardCtrlDefer.reject(err);
            return horn.error(err);
          }
          dashboardCtrlDefer.resolve();
        }
      );
    }

    function setBreadcrumb(bag, next) {
      $scope._r.crumbList = [];

      var crumb = {
        name: 'Dashboard'
      };
      $scope._r.crumbList.push(crumb);
      $scope._r.showCrumb = true;
      $scope._r.title = 'Admiral - Shippable';
      return next();
    }

    function getSystemConfigs(bag, next) {
      admiralApiAdapter.getSystemConfigs(
        function (err, systemConfigs) {
          if (err || !systemConfigs) {
            // the route will return an error when
            // the db hasn't been initialized yet
            return next();
          }

          $scope.vm.systemConfigs.db =
            _.extend($scope.vm.systemConfigs.db,
              (systemConfigs.db && JSON.parse(systemConfigs.db)));
          $scope.vm.systemConfigs.secrets =
            _.extend($scope.vm.systemConfigs.secrets,
              (systemConfigs.secrets && JSON.parse(systemConfigs.secrets)));
          $scope.vm.systemConfigs.msg =
            _.extend($scope.vm.systemConfigs.msg,
              (systemConfigs.msg && JSON.parse(systemConfigs.msg)));
          $scope.vm.systemConfigs.state =
            _.extend($scope.vm.systemConfigs.state,
              (systemConfigs.state && JSON.parse(systemConfigs.state)));
          $scope.vm.systemConfigs.redis =
            _.extend($scope.vm.systemConfigs.redis,
              (systemConfigs.redis && JSON.parse(systemConfigs.redis)));

          $scope.vm.initializeForm.msgPassword =
              $scope.vm.systemConfigs.msg.password || '';
          $scope.vm.initializeForm.statePassword =
            $scope.vm.systemConfigs.state.rootPassword || '';

          return next();
        }
      );
    }

    function initialize() {
      $scope.vm.initializing = true;
      var bag = {};
      async.series([
          postInitialize.bind(null, bag),
          getSystemConfigs.bind(null, bag)
        ],
        function (err) {
          $scope.vm.initializing = false;
          if (err) {
            horn.error(err);
            return;
          }
        }
      );
    }
    function postInitialize(bag, next) {
      admiralApiAdapter.postInitialize($scope.vm.initializeForm,
        function (err) {
          if (err)
            horn.error(err);
          return next();
        }
      );
    }

    function showConfigModal(service) {
      $scope.vm.selectedService = $scope.vm.systemConfigs[service];

      admiralApiAdapter.getService(service,
        function (err, configs) {
          if (err)
            return horn.error(err);

          $scope.vm.selectedService.configs = [];

          _.each(configs,
            function(value, key) {
              $scope.vm.selectedService.configs.push({
                key: key,
                value: value
              });
            }
          );

          $('#configsModal').modal('show');
        }
      );
    }

    function showLogModal(service) {
      $scope.vm.selectedService = $scope.vm.systemConfigs[service];
      $scope.vm.selectedService.logs = [];

      admiralApiAdapter.getServiceLogs(service,
        function (err, logs) {
          if (err)
            return horn.error(err);

          $scope.vm.selectedService.logs = logs;

          $('#logsModal').modal('show');
        }
      );
    }

    function logOutOfAdmiral(e) {
      admiralApiAdapter.postLogout({},
        function (err) {
          if (err)
            return horn.error(err);

          e.preventDefault();
          $state.go('login', $state.params);
          window.scrollTo(0, 0);
        }
      );
    }
  }
}());
