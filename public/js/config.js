/* global angular: false */

var configModule = angular.module('ConfigModule', []);

configModule.run(['$rootScope', function($rootScope) {
  $rootScope.encodeURIComponent = encodeURIComponent;
}]);
