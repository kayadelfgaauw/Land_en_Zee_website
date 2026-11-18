document.addEventListener('DOMContentLoaded', function () {
    var packageButtons = document.querySelectorAll('.btn-select-package');
    var arrangementInput = document.getElementById('arrangement');
    var arrangementHelp = document.getElementById('arrangement-help');
    var overnightInput = document.getElementById('overnight');
    var cateringInput = document.getElementById('catering');
    var menuInput = document.getElementById('menu-package');
    var participantsInput = document.getElementById('participants');
    var overnightParticipantsInput = document.getElementById('overnight-participants');
    var roomLayoutInput = document.getElementById('room-layout');
    var includedOptions = null;

    function showOptionalField(field, groupId, visible) {
        document.getElementById(groupId).hidden = !visible;
        field.disabled = !visible;
        // Clear an earlier inline error when a field becomes irrelevant or
        // its allowed range changes, without discarding the visitor's value.
        field.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function updateMeetingDetails() {
        var meetings = ['Halve dag arrangement', 'Hele dag arrangement', 'Heisessie', 'Meerdagen arrangement', 'Training'];
        showOptionalField(roomLayoutInput, 'room-layout-group', meetings.includes(arrangementInput.value));
        var total = Number(participantsInput.value);
        if (Number.isInteger(total) && total > 0) {
            overnightParticipantsInput.max = String(total);
        } else {
            overnightParticipantsInput.removeAttribute('max');
        }
        var hasOvernight = arrangementInput.value === 'Meerdagen arrangement' || overnightInput.value === 'Ja';
        showOptionalField(overnightParticipantsInput, 'overnight-participants-group', hasOvernight);
    }

    overnightInput.addEventListener('change', updateMeetingDetails);
    participantsInput.addEventListener('input', updateMeetingDetails);
    participantsInput.addEventListener('change', updateMeetingDetails);

    function updateMenuOptions() {
        var hasMeal = cateringInput.value === 'Lunch' || cateringInput.value === 'Diner' || cateringInput.value === 'Lunch en diner';
        var showMenu = cateringInput.value !== 'Geen' && (hasMeal || menuInput.value !== '');
        document.getElementById('menu-package-group').hidden = !showMenu;
        menuInput.disabled = !showMenu;
    }

    cateringInput.addEventListener('change', updateMenuOptions);

    function updateIncludedOptions() {
        var isRetreat = arrangementInput.value === 'Meerdagen arrangement';
        if (isRetreat && !includedOptions) {
            includedOptions = { overnight: overnightInput.value, catering: cateringInput.value };
            overnightInput.value = 'Ja';
            cateringInput.value = 'Lunch en diner';
        } else if (!isRetreat && includedOptions) {
            overnightInput.value = includedOptions.overnight;
            cateringInput.value = includedOptions.catering;
            includedOptions = null;
        }
        document.getElementById('overnight-group').hidden = isRetreat;
        document.getElementById('catering-group').hidden = isRetreat;
        arrangementHelp.textContent = isRetreat
            ? 'Bij dit retreat zijn overnachtingen, ontbijt, lunches en diners inbegrepen.'
            : '';
        arrangementHelp.hidden = !isRetreat;
        updateMenuOptions();
        updateMeetingDetails();
    }

    arrangementInput.addEventListener('change', updateIncludedOptions);
    arrangementInput.form.addEventListener('reset', function () {
        setTimeout(function () {
            includedOptions = null;
            updateIncludedOptions();
        }, 0);
    });
    updateIncludedOptions();
    packageButtons.forEach(function (btn) {
        function selectAndScroll() {
            var pkg = btn.getAttribute('data-package');
            var catering = btn.getAttribute('data-catering');
            var menu = btn.getAttribute('data-menu');
            var formSection = document.getElementById('aanvraag-formulier');
            // Catering is an addition to an existing meeting, rather than a replacement.
            if (((!catering && !menu) || !arrangementInput.value) && Array.from(arrangementInput.options).some(function (option) { return option.value === pkg; })) {
                arrangementInput.value = pkg;
                arrangementInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (catering && arrangementInput.value !== 'Meerdagen arrangement') {
                var combinesMeals = cateringInput.value === 'Lunch en diner'
                    || (catering === 'Lunch' && cateringInput.value === 'Diner')
                    || (catering === 'Diner' && cateringInput.value === 'Lunch');
                cateringInput.value = combinesMeals ? 'Lunch en diner' : catering;
            }
            if (menu) {
                menuInput.value = menu;
                if (cateringInput.value === 'Geen') cateringInput.value = 'Nog te bepalen';
            }
            updateMenuOptions();
            if (formSection) {
                formSection.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            }
            arrangementInput.focus({ preventScroll: true });
        }

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            selectAndScroll();
        });

        if (!btn.matches('a, button')) btn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectAndScroll();
            }
        });
    });
});
    
