const React = require('react');
const AnswerOption = require('./AnswerOption');

const Selector = function (obj) {
    return <select id={obj.id} className={obj.class}>{obj.value.map((item) => <AnswerOption key={item.toString()} value={item.name} />)}</select>
}

module.exports = Selector;