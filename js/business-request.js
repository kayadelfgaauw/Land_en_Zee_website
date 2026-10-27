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

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (sending || sent || !form.reportValidity()) return;

        sending = true;
        error.hidden = true;
        button.disabled = true;
        button.textContent = 'BEZIG MET VERSTUREN…';
        status.textContent = 'Uw aanvraag wordt verstuurd. Een ogenblik geduld.';
        form.setAttribute('aria-busy', 'true');

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
            form.removeAttribute('aria-busy');
            button.disabled = false;
            button.textContent = buttonText;
            status.textContent = '';
        }
    });
});
