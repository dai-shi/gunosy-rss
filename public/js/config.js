/* global angular: false */

var configModule = angular.module('ConfigModule', []);

configModule.run(function($rootScope) {
  $rootScope.encodeURIComponent = encodeURIComponent;
});
