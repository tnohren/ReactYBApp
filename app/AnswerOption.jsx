const React = require('react');

const AnswerOption = function (majorMinor) {
    return <option>{majorMinor.value}</option>;
}

module.exports = AnswerOption;