angular.module('demo', ['bsSwitch'])
    .controller('main', function($scope, $timeout) {

        $timeout(function() {
            loadData();
        }, 100);

        $scope.ref = function() {
            $scope.galleryData = undefined;
            $scope.sliderData = undefined;

            $timeout(function() {
                loadData();
            }, 400);
        };

        function loadData() {
            $scope.galleryData = [
                "images/01.jpg",
                "images/02.jpg",
                "images/03.jpg",
                "images/04.jpg",
                "images/05.jpg",
                "images/06.jpg",
                "images/07.jpg",
                "images/08.jpg",
                "images/09.jpg"
            ];

            $scope.sliderData = [
                "images/w01.jpg",
                "images/w02.jpg",
                "images/w03.jpg",
                "images/w04.jpg"
            ];
        }
    });
