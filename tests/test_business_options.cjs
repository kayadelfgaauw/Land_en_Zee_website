const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Model controls and events only; execute the actual shared form script.
function control(value = '') {
    return {
        value, disabled: false, hidden: false, listeners: {},
        addEventListener(name, callback) { this.listeners[name] = callback; },
        dispatchEvent(event) { this.listeners[event.type]?.(event); },
        removeAttribute(name) { delete this[name]; },
        focus() {}, scrollIntoView() {}
    };
}

function form(arrangement = '', overnight = 'Nee') {
    const ids = {};
    for (const id of ['arrangement', 'arrangement-help', 'participants', 'overnight',
        'catering', 'menu-package', 'menu-package-group', 'overnight-group',
        'catering-group', 'overnight-participants', 'overnight-participants-group',
        'room-layout', 'room-layout-group', 'aanvraag-formulier']) ids[id] = control();
    ids.arrangement.value = arrangement;
    ids.arrangement.form = control();
    ids.arrangement.options = ['Halve dag arrangement', 'Hele dag arrangement',
        'Heisessie', 'Meerdagen arrangement', 'Training', 'Werkplek arrangement',
        'Lunch of Diner', 'Bedrijfsuitje op maat', 'Advies of maatwerk'].map(value => ({value}));
    ids.overnight.value = overnight;
    ids.catering.value = 'Nog te bepalen';
    const menuButton = Object.assign(control(), {
        matches: () => true,
        getAttribute: name => ({'data-package': 'Lunch of Diner', 'data-menu': 'Vitaal'}[name] || null)
    });
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/business-options.js'), 'utf8'), {
        document: {
            addEventListener: (_, callback) => callback(),
            getElementById: id => ids[id], querySelectorAll: () => [menuButton]
        },
        window: {matchMedia: () => ({matches: true})},
        Event: class { constructor(type) { this.type = type; } },
        setTimeout: callback => callback()
    });
    return {
        ids,
        change(id, value) { ids[id].value = value; ids[id].dispatchEvent({type: 'change'}); },
        input(id, value) { ids[id].value = value; ids[id].dispatchEvent({type: 'input'}); },
        chooseMenu() { menuButton.listeners.click({preventDefault() {}}); }
    };
}

test('room preferences appear only for meetings, training and retreats', () => {
    const f = form();
    for (const [choice, visible] of [
        ['', false], ['Halve dag arrangement', true], ['Hele dag arrangement', true],
        ['Heisessie', true], ['Training', true], ['Meerdagen arrangement', true],
        ['Werkplek arrangement', false], ['Lunch of Diner', false],
        ['Bedrijfsuitje op maat', false], ['Advies of maatwerk', false]
    ]) {
        f.change('arrangement', choice);
        assert.equal(f.ids['room-layout-group'].hidden, !visible, choice);
        assert.equal(f.ids['room-layout'].disabled, !visible, choice);
    }
});

test('overnight count follows overnight selection and is excluded when hidden', () => {
    const f = form('Training');
    assert.equal(f.ids['overnight-participants'].disabled, true);
    f.change('overnight', 'Ja');
    assert.equal(f.ids['overnight-participants-group'].hidden, false);
    f.ids['overnight-participants'].value = '8';
    f.change('overnight', 'Nee');
    assert.equal(f.ids['overnight-participants'].disabled, true);
    f.change('overnight', 'Ja');
    assert.equal(f.ids['overnight-participants'].value, '8');
});

test('participant edits update the overnight limit without discarding input', () => {
    const f = form('Training', 'Ja');
    f.input('participants', '12');
    f.ids['overnight-participants'].value = '10';
    assert.equal(f.ids['overnight-participants'].max, '12');
    f.input('participants', '6');
    assert.equal(f.ids['overnight-participants'].max, '6');
    assert.equal(f.ids['overnight-participants'].value, '10');
    f.input('participants', '');
    assert.equal(f.ids['overnight-participants'].max, undefined);
});

test('retreat includes meals and lodging, then restores earlier preferences', () => {
    const f = form('Training', 'Nee');
    f.change('catering', 'Diner');
    f.change('arrangement', 'Meerdagen arrangement');
    assert.equal(f.ids.overnight.value, 'Ja');
    assert.equal(f.ids.catering.value, 'Lunch en diner');
    assert.equal(f.ids['overnight-group'].hidden, true);
    assert.equal(f.ids['catering-group'].hidden, true);
    assert.equal(f.ids['overnight-participants'].disabled, false);
    f.change('arrangement', 'Training');
    assert.equal(f.ids.overnight.value, 'Nee');
    assert.equal(f.ids.catering.value, 'Diner');
    assert.equal(f.ids['overnight-participants'].disabled, true);
});

test('menu choice preserves meeting and room preferences', () => {
    const f = form('Training');
    f.ids['room-layout'].value = 'U-vorm';
    f.chooseMenu();
    assert.equal(f.ids.arrangement.value, 'Training');
    assert.equal(f.ids['room-layout'].value, 'U-vorm');
    assert.equal(f.ids['menu-package'].value, 'Vitaal');
    assert.equal(f.ids['menu-package'].disabled, false);
});

test('reset recomputes visibility and clears stored retreat preferences', () => {
    const f = form('Training');
    f.change('arrangement', 'Meerdagen arrangement');
    f.ids.arrangement.value = '';
    f.ids.overnight.value = 'Nog te bepalen';
    f.ids.catering.value = 'Nog te bepalen';
    f.ids.arrangement.form.dispatchEvent({type: 'reset'});
    assert.equal(f.ids['room-layout'].disabled, true);
    assert.equal(f.ids['overnight-participants'].disabled, true);
    assert.equal(f.ids.overnight.value, 'Nog te bepalen');
});
