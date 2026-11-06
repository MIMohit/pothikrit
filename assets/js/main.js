/* Pothikrit — small progressive-enhancement script (no dependencies).
   Everything on the site works without it; this adds the mobile menu,
   header shadow, scroll reveal and friendlier contact-form handling. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Mobile navigation ------------------------------------------------ */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var panel = document.getElementById("nav-panel");

  function setMenu(open) {
    if (!header || !toggle) return;
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    // Close after choosing a link (useful for same-page anchors).
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1140) setMenu(false);
    });
  }

  /* ---- Sticky header shadow -------------------------------------------- */
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Reveal on scroll -------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- Contact form ------------------------------------------------------ */
  var CONTACT_EMAIL = "info@pothikrit.com";
  var form = document.querySelector("form[data-contact-form]");
  if (!form) return;

  form.noValidate = true; // we show our own inline messages instead of browser bubbles

  var statusEl = form.querySelector(".form__status");
  var submitBtn = form.querySelector('[type="submit"]');

  // Pre-select a subject from ?subject=... (e.g. contact.html?subject=programme)
  var subjectSelect = form.querySelector("#cf-topic");
  try {
    var wanted = new URLSearchParams(window.location.search).get("subject");
    if (wanted && subjectSelect) {
      Array.prototype.forEach.call(subjectSelect.options, function (opt) {
        if (opt.dataset.key === wanted) subjectSelect.value = opt.value;
      });
    }
  } catch (err) { /* older browsers: ignore */ }

  var messages = {
    "cf-name": { valueMissing: "Please tell us your name." },
    "cf-email": {
      valueMissing: "Please enter your email address so we can reply.",
      typeMismatch: "That email address doesn’t look right — please check it (e.g. you@example.com)."
    },
    "cf-msg": { valueMissing: "Please write a short message." },
    "cf-consent": { valueMissing: "Please tick this box so we can use your details to reply." }
  };

  function errorFor(field) {
    var v = field.validity;
    var m = messages[field.id] || {};
    if (v.valid) return "";
    if (v.valueMissing) return m.valueMissing || "This field is required.";
    if (v.typeMismatch) return m.typeMismatch || "Please check this field.";
    if (v.tooLong) return "This is a little too long.";
    return field.validationMessage || "Please check this field.";
  }

  function showError(field) {
    var errEl = document.getElementById(field.id + "-error");
    var msg = errorFor(field);
    if (msg) {
      field.setAttribute("aria-invalid", "true");
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
    } else {
      field.removeAttribute("aria-invalid");
      if (errEl) { errEl.textContent = ""; errEl.hidden = true; }
    }
    return !msg;
  }

  var validated = Array.prototype.filter.call(form.elements, function (el) {
    return el.willValidate && el.type !== "submit";
  });

  validated.forEach(function (field) {
    // Validate on blur; once a field has been flagged, re-check as the user types.
    field.addEventListener("blur", function () {
      if (field.value || field.hasAttribute("aria-invalid")) showError(field);
    });
    field.addEventListener(field.type === "checkbox" ? "change" : "input", function () {
      if (field.hasAttribute("aria-invalid")) showError(field);
    });
  });

  function setStatus(html, isError) {
    if (!statusEl) return;
    statusEl.innerHTML = html;
    statusEl.classList.toggle("form__status--error", !!isError);
    statusEl.hidden = false;
  }

  function value(id) {
    var el = form.querySelector("#" + id);
    return el ? el.value.trim() : "";
  }

  function buildMailto() {
    var topic = value("cf-topic") || "General enquiry";
    var subject = "[Website] " + topic + " — " + value("cf-name");
    var lines = [
      "Name: " + value("cf-name"),
      "Email: " + value("cf-email"),
      "Organisation: " + (value("cf-org") || "—"),
      "Subject: " + topic,
      "",
      value("cf-msg"),
      "",
      "— Sent via the contact form on pothikrit.com. I agree that Pothikrit may use these details to respond to my enquiry."
    ];
    return "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (statusEl) statusEl.hidden = true;

    var firstInvalid = null;
    validated.forEach(function (field) {
      if (!showError(field) && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var endpoint = (form.getAttribute("data-endpoint") || "").trim();

    // No endpoint configured: hand the message to the visitor's email app.
    if (!endpoint) {
      var href = buildMailto();
      window.location.href = href;
      setStatus(
        "Your email app should now open with your message ready. <strong>It has not been sent yet</strong> — " +
        "please press <em>Send</em> in your email app. If nothing opened, " +
        '<a href="' + href.replace(/"/g, "&quot;") + '">try this link</a> or write to us directly at ' +
        '<a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + "</a>."
      );
      statusEl && statusEl.focus();
      return;
    }

    // Endpoint configured (e.g. Formspree / Web3Forms): POST the form data.
    if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.label = submitBtn.textContent; submitBtn.textContent = "Sending…"; }
    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      form.reset();
      validated.forEach(function (f) { f.removeAttribute("aria-invalid"); });
      setStatus("<strong>Thank you — your message has been sent.</strong> Our team will reply to the email address you provided.");
    }).catch(function () {
      setStatus(
        "<strong>Sorry, your message could not be sent.</strong> Nothing was delivered. Please try again, or " +
        '<a href="' + buildMailto().replace(/"/g, "&quot;") + '">send it by email instead</a> to ' + CONTACT_EMAIL + ".",
        true
      );
    }).then(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.label || "Send message →"; }
      statusEl && statusEl.focus();
    });
  });
})();
