var app = angular.module('reportingApp', []);
//<editor-fold desc="global helpers">
var isValueAnArray = function (val) {
    return Array.isArray(val);
};
var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    }
    else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};
var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};
var getShortDescription = function (str) {
    return str.split('|')[0];
};
var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};
var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp), yyyy = d.getFullYear(), mm = ('0' + (d.getMonth() + 1)).slice(-2), dd = ('0' + d.getDate()).slice(-2), hh = d.getHours(), h = hh, min = ('0' + d.getMinutes()).slice(-2), ampm = 'AM', time;
    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    }
    else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    }
    else if (hh === 0) {
        h = 12;
    }
    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
    return time;
};
var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }
    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }
    return 0;
};
//</editor-fold>
app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
        var that = this;
        var clientDefaults = {};
        $scope.searchSettings = Object.assign({
            description: '',
            allselected: true,
            passed: true,
            failed: true,
            pending: true,
            withLog: true
        }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit
        this.warningTime = 1400;
        this.dangerTime = 1900;
        this.totalDurationFormat = clientDefaults.totalDurationFormat;
        this.showTotalDurationIn = clientDefaults.showTotalDurationIn;
        var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
        if (initialColumnSettings) {
            if (initialColumnSettings.displayTime !== undefined) {
                // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
                this.displayTime = !initialColumnSettings.displayTime;
            }
            if (initialColumnSettings.displayBrowser !== undefined) {
                this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
            }
            if (initialColumnSettings.displaySessionId !== undefined) {
                this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
            }
            if (initialColumnSettings.displayOS !== undefined) {
                this.displayOS = !initialColumnSettings.displayOS; // same as above
            }
            if (initialColumnSettings.inlineScreenshots !== undefined) {
                this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
            }
            else {
                this.inlineScreenshots = false;
            }
            if (initialColumnSettings.warningTime) {
                this.warningTime = initialColumnSettings.warningTime;
            }
            if (initialColumnSettings.dangerTime) {
                this.dangerTime = initialColumnSettings.dangerTime;
            }
        }
        this.chooseAllTypes = function () {
            var value = true;
            $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
            if (!$scope.searchSettings.allselected) {
                value = false;
            }
            $scope.searchSettings.passed = value;
            $scope.searchSettings.failed = value;
            $scope.searchSettings.pending = value;
            $scope.searchSettings.withLog = value;
        };
        this.isValueAnArray = function (val) {
            return isValueAnArray(val);
        };
        this.getParent = function (str) {
            return getParent(str);
        };
        this.getSpec = function (str) {
            return getSpec(str);
        };
        this.getShortDescription = function (str) {
            return getShortDescription(str);
        };
        this.hasNextScreenshot = function (index) {
            var old = index;
            return old !== this.getNextScreenshotIdx(index);
        };
        this.hasPreviousScreenshot = function (index) {
            var old = index;
            return old !== this.getPreviousScreenshotIdx(index);
        };
        this.getNextScreenshotIdx = function (index) {
            var next = index;
            var hit = false;
            while (next + 2 < this.results.length) {
                next++;
                if (this.results[next].screenShotFile && !this.results[next].pending) {
                    hit = true;
                    break;
                }
            }
            return hit ? next : index;
        };
        this.getPreviousScreenshotIdx = function (index) {
            var prev = index;
            var hit = false;
            while (prev > 0) {
                prev--;
                if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                    hit = true;
                    break;
                }
            }
            return hit ? prev : index;
        };
        this.convertTimestamp = convertTimestamp;
        this.round = function (number, roundVal) {
            return (parseFloat(number) / 1000).toFixed(roundVal);
        };
        this.passCount = function () {
            var passCount = 0;
            for (var i in this.results) {
                var result = this.results[i];
                if (result.passed) {
                    passCount++;
                }
            }
            return passCount;
        };
        this.pendingCount = function () {
            var pendingCount = 0;
            for (var i in this.results) {
                var result = this.results[i];
                if (result.pending) {
                    pendingCount++;
                }
            }
            return pendingCount;
        };
        this.failCount = function () {
            var failCount = 0;
            for (var i in this.results) {
                var result = this.results[i];
                if (!result.passed && !result.pending) {
                    failCount++;
                }
            }
            return failCount;
        };
        this.totalDuration = function () {
            var sum = 0;
            for (var i in this.results) {
                var result = this.results[i];
                if (result.duration) {
                    sum += result.duration;
                }
            }
            return sum;
        };
        this.passPerc = function () {
            return (this.passCount() / this.totalCount()) * 100;
        };
        this.pendingPerc = function () {
            return (this.pendingCount() / this.totalCount()) * 100;
        };
        this.failPerc = function () {
            return (this.failCount() / this.totalCount()) * 100;
        };
        this.totalCount = function () {
            return this.passCount() + this.failCount() + this.pendingCount();
        };
        var results = [
            {
                "description": "select ECM and login|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "Windows",
                "instanceId": 4808,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [],
                "screenShotFile": "008a00dd-0074-00f2-009a-00d4000700ab.png",
                "timestamp": 1586731326392,
                "duration": 8670
            },
            {
                "description": "Create New Folder|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "Windows",
                "instanceId": 4808,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [],
                "screenShotFile": "0044005a-0098-0052-00bd-00ca00fd0057.png",
                "timestamp": 1586731335393,
                "duration": 3823
            },
            {
                "description": "Create Duplicate Folder|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "Windows",
                "instanceId": 4808,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [
                    {
                        "level": "SEVERE",
                        "message": "http://qaexercise.envalfresco.com/alfresco/api/-default-/public/alfresco/versions/1/nodes/-my-/children - Failed to load resource: the server responded with a status of 409 ()",
                        "timestamp": 1586731340774,
                        "type": ""
                    }
                ],
                "screenShotFile": "006d00c9-0000-00c6-0002-0030006600d4.png",
                "timestamp": 1586731339546,
                "duration": 1309
            },
            {
                "description": "Delete Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "Windows",
                "instanceId": 4808,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": [
                    "Expected '' to contain 'kalpesh-dixit-ness deleted'."
                ],
                "trace": [
                    "Error: Failed expectation\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:40:52)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
                ],
                "browserLogs": [],
                "screenShotFile": "00080090-0088-0049-0068-009500dc009a.png",
                "timestamp": 1586731341266,
                "duration": 4911
            },
            {
                "description": "select ECM and login|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "Windows",
                "instanceId": 13076,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [],
                "screenShotFile": "0023001e-00c6-00d2-0092-00db00950037.png",
                "timestamp": 1586731472866,
                "duration": 9336
            },
            {
                "description": "Create New Folder|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "Windows",
                "instanceId": 13076,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [],
                "screenShotFile": "00d400c8-004c-0058-00a4-00ec000b00c2.png",
                "timestamp": 1586731482560,
                "duration": 3818
            },
            {
                "description": "Create Duplicate Folder|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "Windows",
                "instanceId": 13076,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [
                    {
                        "level": "SEVERE",
                        "message": "http://qaexercise.envalfresco.com/alfresco/api/-default-/public/alfresco/versions/1/nodes/-my-/children - Failed to load resource: the server responded with a status of 409 ()",
                        "timestamp": 1586731487962,
                        "type": ""
                    }
                ],
                "screenShotFile": "006e00ea-0068-0008-00b3-007e008700a5.png",
                "timestamp": 1586731486714,
                "duration": 1301
            },
            {
                "description": "Delete Folder|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "Windows",
                "instanceId": 13076,
                "browser": {
                    "name": "chrome",
                    "version": "81.0.4044.92"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [],
                "screenShotFile": "00a40068-00ee-003f-0097-00bb00150030.png",
                "timestamp": 1586731488412,
                "duration": 4820
            },
            {
                "description": "select ECM and login|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "windows",
                "instanceId": 19356,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [],
                "screenShotFile": "00ae005b-001e-002d-00a6-00ce0090000e.png",
                "timestamp": 1586731548903,
                "duration": 11512
            },
            {
                "description": "Create New Folder|Alfresco ADF Demo",
                "passed": true,
                "pending": false,
                "os": "windows",
                "instanceId": 19356,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": "Passed.",
                "trace": "",
                "browserLogs": [],
                "screenShotFile": "00d4001d-00df-00e4-00fd-007d00c30026.png",
                "timestamp": 1586731560508,
                "duration": 3921
            },
            {
                "description": "Create Duplicate Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 19356,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Element <button id=\"adf-folder-create-button\" class=\"adf-dialog-action-button mat-button\"> is not clickable at point (776,434) because another element <span class=\"mat-button-wrapper\"> obscures it"
                ],
                "trace": [
                    "WebDriverError: Element <button id=\"adf-folder-create-button\" class=\"adf-dialog-action-button mat-button\"> is not clickable at point (776,434) because another element <span class=\"mat-button-wrapper\"> obscures it\n    at Object.throwDecodedError (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:514:15)\n    at parseHttpResponse (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:519:13)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebElement.click()\n    at Driver.schedule (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:461:65\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at HomePage.createFolder (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\pages\\HomePage.js:107:78)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:32:14)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Create Duplicate Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:30:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "00e100ab-006a-0005-00c1-006500ad00f4.png",
                "timestamp": 1586731564512,
                "duration": 1279
            },
            {
                "description": "Delete Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 19356,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Element <button id=\"adf-folder-cancel-button\" class=\"mat-button\" type=\"button\"> is not clickable at point (710,434) because another element <span class=\"mat-button-wrapper\"> obscures it"
                ],
                "trace": [
                    "WebDriverError: Element <button id=\"adf-folder-cancel-button\" class=\"mat-button\" type=\"button\"> is not clickable at point (710,434) because another element <span class=\"mat-button-wrapper\"> obscures it\n    at Object.throwDecodedError (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:514:15)\n    at parseHttpResponse (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:519:13)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: WebElement.click()\n    at Driver.schedule (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:461:65\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:38:78)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:36:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "0074007f-001d-00fc-0034-008f0055005a.png",
                "timestamp": 1586731565870,
                "duration": 32
            },
            {
                "description": "select ECM and login|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 20488,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Angular could not be found on the page http://qaexercise.envalfresco.com/settings. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
                ],
                "trace": [
                    "Error: Angular could not be found on the page http://qaexercise.envalfresco.com/settings. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\browser.js:720:27\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"select ECM and login\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:12:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "00a900c8-0032-0047-005a-00cf00b30058.png",
                "timestamp": 1586731658308,
                "duration": 10775
            },
            {
                "description": "Create New Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 20488,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Index out of bound. Trying to access element at index: 2, but there are only 0 elements that match locator By(css selector, mat-nav-list.app-sidenav-linklist>mat-list-item)"
                ],
                "trace": [
                    "NoSuchElementError: Index out of bound. Trying to access element at index: 2, but there are only 0 elements that match locator By(css selector, mat-nav-list.app-sidenav-linklist>mat-list-item)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:274:27\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at HomePage.clickContentServices (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\pages\\HomePage.js:98:21)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:24:14)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Create New Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:22:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "008500ad-0085-0091-005d-007600660020.png",
                "timestamp": 1586731669170,
                "duration": 392
            },
            {
                "description": "Create Duplicate Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 20488,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Index out of bound. Trying to access element at index: 1, but there are only 0 elements that match locator By(css selector, .app-document-action-buttons>button)"
                ],
                "trace": [
                    "NoSuchElementError: Index out of bound. Trying to access element at index: 1, but there are only 0 elements that match locator By(css selector, .app-document-action-buttons>button)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:274:27\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at HomePage.createFolder (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\pages\\HomePage.js:103:14)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:32:14)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Create Duplicate Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:30:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "002100bd-007b-00de-00a6-0058000900d3.png",
                "timestamp": 1586731669623,
                "duration": 22
            },
            {
                "description": "Delete Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 20488,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: No element found using locator: By(css selector, *[id=\"adf-folder-cancel-button\"])"
                ],
                "trace": [
                    "NoSuchElementError: No element found using locator: By(css selector, *[id=\"adf-folder-cancel-button\"])\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:38:78)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:36:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "00b800d2-0014-00d5-003c-00a7002a0066.png",
                "timestamp": 1586731669705,
                "duration": 16
            },
            {
                "description": "select ECM and login|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 11588,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Angular could not be found on the page http://qaexercise.envalfresco.com/settings. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
                ],
                "trace": [
                    "Error: Angular could not be found on the page http://qaexercise.envalfresco.com/settings. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\browser.js:720:27\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"select ECM and login\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:12:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "00c000e5-00bc-0033-0054-00b8005d0089.png",
                "timestamp": 1586731728094,
                "duration": 10889
            },
            {
                "description": "Create New Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 11588,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
                ],
                "trace": [
                    "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\browser.js:463:23\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at HomePage.clickContentServices (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\pages\\HomePage.js:98:21)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:24:14)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Create New Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:22:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "00ff00f2-00aa-00de-00d6-00d7009a00e8.png",
                "timestamp": 1586731739076,
                "duration": 28
            },
            {
                "description": "Create Duplicate Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 11588,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: Index out of bound. Trying to access element at index: 1, but there are only 0 elements that match locator By(css selector, .app-document-action-buttons>button)"
                ],
                "trace": [
                    "NoSuchElementError: Index out of bound. Trying to access element at index: 1, but there are only 0 elements that match locator By(css selector, .app-document-action-buttons>button)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:274:27\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at HomePage.createFolder (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\pages\\HomePage.js:103:14)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:32:14)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Create Duplicate Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:30:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "008200cd-00ed-007a-0062-004f002600a9.png",
                "timestamp": 1586731739157,
                "duration": 375
            },
            {
                "description": "Delete Folder|Alfresco ADF Demo",
                "passed": false,
                "pending": false,
                "os": "windows",
                "instanceId": 11588,
                "browser": {
                    "name": "firefox",
                    "version": "75.0"
                },
                "message": [
                    "Failed: No element found using locator: By(css selector, *[id=\"adf-folder-cancel-button\"])"
                ],
                "trace": [
                    "NoSuchElementError: No element found using locator: By(css selector, *[id=\"adf-folder-cancel-button\"])\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)Error: \n    at ElementArrayFinder.applyAction_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:38:78)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Delete Folder\") in control flow\n    at UserContext.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError: \n    at Suite.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:36:5)\n    at addSpecsToSuite (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\outputjs\\specs\\ADFDemo.js:8:1)\n    at Module._compile (internal/modules/cjs/loader.js:1156:30)\n    at Module.m._compile (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:836:23)\n    at Module._extensions..js (internal/modules/cjs/loader.js:1176:10)\n    at Object.require.extensions.<computed> [as .js] (D:\\Kalpesh\\Alfresco-Project\\Alfresco_TypeScript\\node_modules\\ts-node\\src\\index.ts:839:12)"
                ],
                "browserLogs": [],
                "screenShotFile": "001600b9-00b2-00c1-00d2-00c600bc0006.png",
                "timestamp": 1586731739638,
                "duration": 21
            }
        ];
        this.sortSpecs = function () {
            this.results = results.sort(function sortFunction(a, b) {
                if (a.sessionId < b.sessionId)
                    return -1;
                else if (a.sessionId > b.sessionId)
                    return 1;
                if (a.timestamp < b.timestamp)
                    return -1;
                else if (a.timestamp > b.timestamp)
                    return 1;
                return 0;
            });
        };
        this.setTitle = function () {
            var title = $('.report-title').text();
            titleService.setTitle(title);
        };
        // is run after all test data has been prepared/loaded
        this.afterLoadingJobs = function () {
            this.sortSpecs();
            this.setTitle();
        };
        this.loadResultsViaAjax = function () {
            $http({
                url: './combined.json',
                method: 'GET'
            }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    }
                    else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            }, function (error) {
                console.error(error);
            });
        };
        if (clientDefaults.useAjax) {
            this.loadResultsViaAjax();
        }
        else {
            this.afterLoadingJobs();
        }
    }]);
app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;
            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents
            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {
                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                }
                else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                }
                else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);
                filtered.push(item);
                prevItem = item;
            }
        }
        return filtered;
    };
});
//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if (tr == null) {
            return "NaN";
        }
        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's':
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr * 60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }
        return tr;
    };
});
function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }
            return 'highlight';
        }
        return '';
    };
}
app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});
function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        }
        else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };
    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        var modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };
}
app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});
app.factory('TitleService', ['$document', function ($document) {
        return {
            setTitle: function (title) {
                $document[0].title = title;
            }
        };
    }]);
app.run(function ($rootScope, $templateCache) {
    //make sure this option is on by default
    $rootScope.showSmartStackTraceHighlight = true;
    $templateCache.put('pbr-screenshot-modal.html', '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
        '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
        '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
        '        <div class="modal-content">\n' +
        '            <div class="modal-header">\n' +
        '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
        '                    <span aria-hidden="true">&times;</span>\n' +
        '                </button>\n' +
        '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
        '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
        '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
        '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
        '            </div>\n' +
        '            <div class="modal-body">\n' +
        '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
        '            </div>\n' +
        '            <div class="modal-footer">\n' +
        '                <div class="pull-left">\n' +
        '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
        '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
        '                        Prev\n' +
        '                    </button>\n' +
        '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
        '                            data-dismiss="modal" data-toggle="modal"\n' +
        '                            data-target="#imageModal{{$ctrl.next}}">\n' +
        '                        Next\n' +
        '                    </button>\n' +
        '                </div>\n' +
        '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
        '                    Open Image in New Tab\n' +
        '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
        '                </a>\n' +
        '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n' +
        '');
    $templateCache.put('pbr-stack-modal.html', '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
        '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
        '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
        '        <div class="modal-content">\n' +
        '            <div class="modal-header">\n' +
        '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
        '                    <span aria-hidden="true">&times;</span>\n' +
        '                </button>\n' +
        '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
        '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
        '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
        '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
        '            </div>\n' +
        '            <div class="modal-body">\n' +
        '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
        '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
        '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
        '                    </div>\n' +
        '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
        '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
        '                    </div>\n' +
        '                </div>\n' +
        '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
        '                    <h5 class="modal-title">\n' +
        '                        Browser logs:\n' +
        '                    </h5>\n' +
        '                    <pre class="logContainer"><div class="browserLogItem"\n' +
        '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
        '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '            <div class="modal-footer">\n' +
        '                <button class="btn btn-default"\n' +
        '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
        '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
        '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
        '                </button>\n' +
        '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n' +
        '');
});
//# sourceMappingURL=app.js.map