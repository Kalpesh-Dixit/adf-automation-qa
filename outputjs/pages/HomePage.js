"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var protractor_1 = require("protractor");
var HomePage = /** @class */ (function () {
    function HomePage() {
    }
    HomePage.prototype.clickContentServices = function () {
        console.log("Clicking Content Services");
        protractor_1.element.all(protractor_1.by.css("mat-nav-list.app-sidenav-linklist>mat-list-item"))
            .get(2).click();
    };
    HomePage.prototype.createFolder = function (folderName) {
        console.log("clicking New Folder button");
        protractor_1.element.all(protractor_1.by.css(".app-document-action-buttons>button")).get(1)
            .click();
        console.log("Entering Folder Name: " + folderName);
        protractor_1.element(protractor_1.by.id("adf-folder-name-input")).sendKeys(folderName);
        console.log("clicking create button");
        protractor_1.element(protractor_1.by.id("adf-folder-create-button")).click();
    };
    HomePage.prototype.verifyFolderName = function (folderName) {
        return __awaiter(this, void 0, void 0, function () {
            var folderList, i, name_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, protractor_1.element.all(protractor_1.by.css("div.adf-datatable-body>adf-datatable-row")).getWebElements()];
                    case 1:
                        folderList = _a.sent();
                        console.log("Number of folders in List:" + (folderList).length);
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < folderList.length)) return [3 /*break*/, 6];
                        return [4 /*yield*/, folderList[i].findElement(protractor_1.by.css("span.adf-datatable-cell-value"))];
                    case 3:
                        name_1 = (_a.sent()).getText();
                        return [4 /*yield*/, name_1];
                    case 4:
                        if ((_a.sent()) == folderName) {
                            console.log("Folder Found:" + name_1);
                            return [2 /*return*/, name_1];
                        }
                        _a.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/, false];
                }
            });
        });
    };
    HomePage.prototype.verifyDuplicateFolderError = function () {
        console.log("Fetching error message");
        protractor_1.browser.sleep(1000);
        var errorMsg = protractor_1.element(protractor_1.by.css("simple-snack-bar.mat-simple-snackbar")).getText();
        return errorMsg;
    };
    HomePage.prototype.deleteFolder = function (folderName) {
        return __awaiter(this, void 0, void 0, function () {
            var folderList, i, name_2, errorMsg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, protractor_1.element.all(protractor_1.by.css("div.adf-datatable-body>adf-datatable-row")).getWebElements()];
                    case 1:
                        folderList = _a.sent();
                        console.log("Number of folders in List:" + (folderList).length);
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < folderList.length)) return [3 /*break*/, 6];
                        return [4 /*yield*/, folderList[i].findElement(protractor_1.by.css("span.adf-datatable-cell-value"))];
                    case 3:
                        name_2 = (_a.sent()).getText();
                        return [4 /*yield*/, name_2];
                    case 4:
                        if ((_a.sent()) == folderName) {
                            console.log("Folder Found:" + name_2);
                            console.log("Deleting Folder:" + folderName);
                            protractor_1.element(protractor_1.by.id("action_menu_right_" + i)).click();
                            console.log("Fetching Delete confirmation message");
                            protractor_1.element.all(protractor_1.by.css(".mat-menu-content>button")).get(4).click();
                            protractor_1.browser.sleep(1000);
                            errorMsg = protractor_1.element(protractor_1.by.css("simple-snack-bar.mat-simple-snackbar")).getText();
                            return [2 /*return*/, errorMsg];
                        }
                        _a.label = 5;
                    case 5:
                        i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/, false];
                }
            });
        });
    };
    return HomePage;
}());
exports.HomePage = HomePage;
//# sourceMappingURL=HomePage.js.map