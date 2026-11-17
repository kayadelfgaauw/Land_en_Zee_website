document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.business-request-form');
    if (!form || typeof fetch !== 'function') return;

    var button = form.querySelector('button[type="submit"]');
    var error = document.getElementById('business-request-error');
    var status = document.getElementById('business-request-status');
    var success = document.getElementById('business-request-success');
    var buttonText = button.textContent;
    var sending = false;
    var sent = false;

    function fieldMessage(field) {
        if (field.validity.valueMissing) return field.tagName === 'SELECT' ? 'Maak een keuze.' : 'Vul dit veld in.';
        if (field.validity.typeMismatch) return 'Vul een geldig e-mailadres in, bijvoorbeeld naam@bedrijf.nl.';
        if (field.validity.rangeUnderflow || field.validity.stepMismatch || field.validity.badInput) return 'Vul een heel aantal personen in van minimaal 1.';
        return 'Controleer de invoer in dit veld.';
    }

    function fieldError(field, message) {
        var id = field.id + '-error';
        var help = document.getElementById(id);
        if (!help) {
            help = document.createElement('span');
            help.id = id;
            help.className = 'field-error';
            field.insertAdjacentElement('afterend', help);
            var descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
            if (!descriptions.includes(id)) descriptions.push(id);
            field.setAttribute('aria-describedby', descriptions.join(' '));
        }
        help.textContent = message;
        help.hidden = !message;
        if (message) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
    }

    form.addEventListener('invalid', function (event) {
        fieldError(event.target, fieldMessage(event.target));
    }, true);

    function clearCorrectedError(event) {
        if (event.target.hasAttribute('aria-invalid') && event.target.validity.valid) {
            fieldError(event.target, '');
        }
    }
    form.addEventListener('input', clearCorrectedError);
    form.addEventListener('change', clearCorrectedError);
    form.addEventListener('reset', function () {
        form.querySelectorAll('[aria-invalid]').forEach(function (field) { fieldError(field, ''); });
        error.hidden = true;
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (sending || sent || !form.reportValidity()) return;

        sending = true;
        error.hidden = true;
        button.disabled = true;
        button.textContent = 'BEZIG MET VERSTUREN…';
        status.textContent = 'Uw aanvraag wordt verstuurd. Een ogenblik geduld.';
        button.setAttribute('aria-busy', 'true');

        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 30000);

        try {
            var response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });

            if (!response.ok) throw new Error('Submission was not accepted');

            sent = true;
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'aanvraag_zakelijk',
                source_page: form.elements.source_page ? form.elements.source_page.value : window.location.pathname,
                arrangement: form.elements.arrangement ? form.elements.arrangement.value : ''
            });
            form.hidden = true;
            success.hidden = false;
            success.focus();
            success.scrollIntoView({ behavior: 'auto', block: 'center' });
        } catch (failure) {
            error.hidden = false;
            error.focus();
        } finally {
            clearTimeout(timeout);
            sending = false;
            button.removeAttribute('aria-busy');
            button.disabled = false;
            button.textContent = buttonText;
            status.textContent = '';
        }
    });
});
