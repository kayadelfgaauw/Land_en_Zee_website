// Shared keyboard and focus handling for the menu and the booking popup.
(function () {
    var active = null;
    var focusable = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

    function items(dialog) {
        return Array.from(dialog.querySelectorAll(focusable)).filter(function (element) {
            return !element.closest('[hidden], [inert]') && element.getClientRects().length
                && getComputedStyle(element).visibility === 'visible';
        });
    }

    function close(dialog) {
        if (!active || active.dialog !== dialog) return;
        var previous = active;
        active = null;
        previous.siblings.forEach(function (wasInert, element) { element.inert = wasInert; });
        document.body.style.overflow = previous.overflow;
        document.body.classList.remove('has-site-dialog');
        if (previous.trigger) previous.trigger.setAttribute('aria-expanded', 'false');
        var returnTo = previous.focus && previous.focus.isConnected && previous.focus !== document.body
            ? previous.focus : document.querySelector('main, .menu-trigger');
        if (returnTo) returnTo.focus({ preventScroll: true });
        dialog.classList.remove('active');
        dialog.setAttribute('aria-hidden', 'true');
        dialog.removeAttribute('aria-modal');
        dialog.inert = true;
        document.dispatchEvent(new CustomEvent('site-dialog-close'));
    }

    function open(dialog, trigger) {
        // A timed promotion must never interrupt another open dialog.
        if (!dialog || active) return false;
        var previous = {
            dialog: dialog,
            trigger: trigger,
            focus: document.activeElement,
            overflow: document.body.style.overflow,
            siblings: new Map()
        };
        active = previous;
        dialog.inert = false;
        dialog.setAttribute('aria-hidden', 'false');
        dialog.setAttribute('aria-modal', 'true');
        dialog.classList.add('active');
        dialog.setAttribute('tabindex', '-1');
        var targets = items(dialog);
        (targets[0] || dialog).focus({ preventScroll: true });
        // Make siblings inert at each level, including content inside wrappers.
        for (var node = dialog; node.parentElement && node !== document.body; node = node.parentElement) {
            Array.from(node.parentElement.children).forEach(function (sibling) {
                if (sibling !== node && sibling instanceof HTMLElement) {
                    previous.siblings.set(sibling, sibling.inert);
                    sibling.inert = true;
                }
            });
        }
        document.body.style.overflow = 'hidden';
        document.body.classList.add('has-site-dialog');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
        document.dispatchEvent(new CustomEvent('site-dialog-open'));
        return true;
    }

    document.addEventListener('keydown', function (event) {
        if (!active) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            close(active.dialog);
        } else if (event.key === 'Tab') {
            var targets = items(active.dialog);
            var first = targets[0] || active.dialog;
            var last = targets[targets.length - 1] || active.dialog;
            if (!targets.length || (event.shiftKey && document.activeElement === first)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    document.addEventListener('focusin', function (event) {
        if (active && !active.dialog.contains(event.target)) {
            (items(active.dialog)[0] || active.dialog).focus({ preventScroll: true });
        }
    });

    window.landAndSeaDialogs = { open: open, close: close };
})();
