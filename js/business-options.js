document.addEventListener('DOMContentLoaded', function () {
    var packageButtons = document.querySelectorAll('.btn-select-package');
    var arrangementInput = document.getElementById('arrangement');
    var arrangementHelp = document.getElementById('arrangement-help');
    var overnightInput = document.getElementById('overnight');
    var cateringInput = document.getElementById('catering');
    var lunchInput = document.getElementById('lunch-package');
    var includedOptions = null;

    function updateLunchOptions() {
        var hasLunch = cateringInput.value === 'Lunch' || cateringInput.value === 'Lunch en diner';
        document.getElementById('lunch-package-group').hidden = !hasLunch;
        lunchInput.disabled = !hasLunch;
    }

    cateringInput.addEventListener('change', updateLunchOptions);

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
        updateLunchOptions();
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
            var lunch = btn.getAttribute('data-lunch');
            var formSection = document.getElementById('aanvraag-formulier');
            // Catering is an addition to an existing meeting, rather than a replacement.
            if ((!catering || !arrangementInput.value) && Array.from(arrangementInput.options).some(function (option) { return option.value === pkg; })) {
                arrangementInput.value = pkg;
                updateIncludedOptions();
            }
            if (catering && arrangementInput.value !== 'Meerdagen arrangement') {
                var combinesMeals = cateringInput.value === 'Lunch en diner'
                    || (catering === 'Lunch' && cateringInput.value === 'Diner')
                    || (catering === 'Diner' && cateringInput.value === 'Lunch');
                cateringInput.value = combinesMeals ? 'Lunch en diner' : catering;
            }
            if (lunch) {
                lunchInput.value = lunch;
            }
            updateLunchOptions();
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth' });
            }
            arrangementInput.focus({ preventScroll: true });
        }

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            selectAndScroll();
        });

        btn.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectAndScroll();
            }
        });
    });
});
    
