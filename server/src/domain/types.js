"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["INVALID_CARD"] = "INVALID_CARD";
    ErrorCode["DECK_EMPTY"] = "DECK_EMPTY";
    ErrorCode["INVALID_ACTION"] = "INVALID_ACTION";
    ErrorCode["NOT_YOUR_TURN"] = "NOT_YOUR_TURN";
    ErrorCode["CARD_NOT_IN_HAND"] = "CARD_NOT_IN_HAND";
    ErrorCode["INVALID_FORMATION_SUM"] = "INVALID_FORMATION_SUM";
    ErrorCode["FORMATION_NOT_FOUND"] = "FORMATION_NOT_FOUND";
    ErrorCode["CARD_PROTECTED"] = "CARD_PROTECTED";
    ErrorCode["INVALID_STATE"] = "INVALID_STATE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
