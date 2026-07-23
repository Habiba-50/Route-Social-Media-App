"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactEnum = exports.AvailabilityEnum = void 0;
var AvailabilityEnum;
(function (AvailabilityEnum) {
    AvailabilityEnum[AvailabilityEnum["PUBLIC"] = 0] = "PUBLIC";
    AvailabilityEnum[AvailabilityEnum["FRIENDS"] = 1] = "FRIENDS";
    AvailabilityEnum[AvailabilityEnum["ONLY_ME"] = 2] = "ONLY_ME";
})(AvailabilityEnum || (exports.AvailabilityEnum = AvailabilityEnum = {}));
var ReactEnum;
(function (ReactEnum) {
    ReactEnum[ReactEnum["DISLIKE"] = 0] = "DISLIKE";
    ReactEnum[ReactEnum["LIKE"] = 1] = "LIKE";
    ReactEnum[ReactEnum["LOVE"] = 2] = "LOVE";
    ReactEnum[ReactEnum["LAUGH"] = 3] = "LAUGH";
    ReactEnum[ReactEnum["WOW"] = 4] = "WOW";
    ReactEnum[ReactEnum["SAD"] = 5] = "SAD";
    ReactEnum[ReactEnum["ANGRY"] = 6] = "ANGRY";
})(ReactEnum || (exports.ReactEnum = ReactEnum = {}));
