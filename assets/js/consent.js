// FrithX cookie consent banner (provided by the site owner). Loaded on every page.
  // Dynamic, integrated client-side cookie gate
  (function() {
    // Script/iframe gating: script elements with type="text/plain" data-frithx-category="..."
    // and iframes with data-frithx-src="..." data-frithx-category="..." stay inert until their
    // category is granted. Fixed allow-list; unknown categories never run.
    var FX_CATEGORIES = { necessary: 'necessary', analytics: 'analytics', marketing: 'marketing', functional: 'preferences', preferences: 'preferences' };
    var FX_TAGGED = 'script[data-frithx-category],iframe[data-frithx-category]';

    function fxChoicesFor(type) {
      return {
        necessary: true,
        analytics: type === 'all',
        marketing: type === 'all',
        preferences: type === 'all' || type === 'essential'
      };
    }

    // The visitor's stored choices, or null before any choice was made
    function fxGrantedChoices() {
      try {
        var type = localStorage.getItem('fx_cookie_consent');
        if (type === null) return null;
        var stored = JSON.parse(localStorage.getItem('fx_cookie_consent_choices') || 'null');
        return stored && typeof stored === 'object' ? stored : fxChoicesFor(type);
      } catch (e) {
        return null;
      }
    }

    function fxConsentModeUpdate(choices) {

    }

    window.FrithXConsent = {
      hasConsented: localStorage.getItem('fx_cookie_consent') !== null,
      consentValue: localStorage.getItem('fx_cookie_consent') || 'none',
      // Opt-in (Bangladesh PDPA) mode for visitors in BD; see isBdVisitor()
      optIn: false,
      consentVersion: "fx-e6c2c7e9",

      init: function() {
        try {
          if (!window.__fxPvSent) {
            window.__fxPvSent = true;
            var _fxSend = function() {
              var _fxUrl = "https://api.frithx.com/api/pageviews";
              var _fxBody = "{\"d\":\"e4a9218d-2f5e-4a1b-ad67-0053b40faef8\"}";
              if (navigator && navigator.sendBeacon) {
                navigator.sendBeacon(_fxUrl, _fxBody);
              } else if (window.fetch) {
                fetch(_fxUrl, {
                  method: 'POST',
                  body: _fxBody,
                  headers: { 'Content-Type': 'text/plain' },
                  keepalive: true
                });
              }
            };
            if (document && document.prerendering) {
              document.addEventListener('prerenderingchange', _fxSend, { once: true });
            } else {
              _fxSend();
            }
          }
        } catch (e) {}
        this.optIn = this.isBdVisitor();
        if (!this.hasConsented) this.renderBanner();
        this.activateTagged(document);
        this.observeTagged();
        if (this.hasConsented && this.optIn) this.renderPrivacyChoices();
      },

      // Categories whose tagged scripts/iframes have run on this page (they cannot be unloaded)
      activated: {},
      queue: [],
      waiting: false,

      grantedChoices: function() {
        return this.hasConsented ? fxGrantedChoices() : null;
      },

      // The choice key a tagged element needs, or null when its category is not on the allow-list
      categoryKey: function(el) {
        var category = String(el.getAttribute('data-frithx-category') || '').trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(FX_CATEGORIES, category) ? FX_CATEGORIES[category] : null;
      },

      isAllowed: function(el) {
        var key = this.categoryKey(el);
        if (!key) return false;
        if (key === 'necessary') return true;
        var choices = this.grantedChoices();
        return !!(choices && choices[key]);
      },

      activateTagged: function(root) {
        var self = this;
        var nodes = [];
        if (root.nodeType === 1 && root.matches && root.matches(FX_TAGGED)) nodes.push(root);
        if (root.querySelectorAll) nodes = nodes.concat(Array.prototype.slice.call(root.querySelectorAll(FX_TAGGED)));
        nodes.forEach(function(el) {
          if (el.hasAttribute('data-frithx-activated') || el.__fxQueued || !self.isAllowed(el)) return;
          el.__fxQueued = true;
          self.queue.push(el);
        });
        this.drainQueue();
      },

      // Activates in document order; a blocking external script holds the queue until it
      // loads, so inline scripts after it (e.g. a config call) see the library.
      drainQueue: function() {
        var self = this;
        while (!this.waiting && this.queue.length) {
          var el = this.queue.shift();
          el.__fxQueued = false;
          var pending = this.activateElement(el);
          if (pending) {
            this.waiting = true;
            var done = function() {
              if (!self.waiting) return;
              self.waiting = false;
              self.drainQueue();
            };
            pending.addEventListener('load', done);
            pending.addEventListener('error', done);
          }
        }
      },

      // Returns the new script element when the queue must wait for it to load
      activateElement: function(el) {
        if (el.hasAttribute('data-frithx-activated') || !el.parentNode || !this.isAllowed(el)) return null;
        var key = this.categoryKey(el);
        if (el.tagName === 'IFRAME') {
          var frameSrc = el.getAttribute('data-frithx-src');
          if (!frameSrc) return null;
          el.setAttribute('data-frithx-activated', 'true');
          el.setAttribute('src', frameSrc);
          this.activated[key] = true;
          return null;
        }
        // Only blocked scripts: a normal script that merely carries the attribute already ran
        if (String(el.getAttribute('type') || '').trim().toLowerCase() !== 'text/plain') return null;
        el.setAttribute('data-frithx-activated', 'true');
        var script = document.createElement('script');
        Array.prototype.slice.call(el.attributes).forEach(function(attr) {
          var name = attr.name.toLowerCase();
          if (name === 'type' || name === 'data-frithx-category' || name === 'data-frithx-type' || name === 'data-frithx-activated') return;
          script.setAttribute(attr.name, attr.value);
        });
        script.setAttribute('type', el.getAttribute('data-frithx-type') || 'text/javascript');
        if (el.nonce) script.nonce = el.nonce;
        var external = el.hasAttribute('src');
        var blocking = external && !el.hasAttribute('async') && !el.hasAttribute('defer');
        // Inserted scripts default to async; keep ones written as blocking in order
        if (external && !el.hasAttribute('async')) script.async = false;
        if (!external) script.text = el.text;
        this.activated[key] = true;
        el.parentNode.insertBefore(script, el.nextSibling);
        return blocking ? script : null;
      },

      // Tagged scripts/iframes added after load (tag managers, SPAs) are gated the same way
      observeTagged: function() {
        if (this.observer || typeof MutationObserver === 'undefined') return;
        var self = this;
        this.observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(m) {
            for (var i = 0; i < m.addedNodes.length; i++) {
              if (m.addedNodes[i].nodeType === 1) self.activateTagged(m.addedNodes[i]);
            }
          });
        });
        this.observer.observe(document.documentElement, { childList: true, subtree: true });
      },

      // Running scripts cannot be unloaded: after a withdrawal, offer (never force) a reload
      renderReloadNotice: function() {
        if (document.getElementById('frithx-reload-notice')) return;
        var notice = document.createElement('div');
        notice.id = 'frithx-reload-notice';
        notice.setAttribute('role', 'status');
        notice.setAttribute('lang', "bn");
        notice.setAttribute('style', "position:fixed;bottom:16px;right:16px;max-width:360px;z-index:99999;background:#1E293B;color:#F1F5F9;border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.45;box-shadow:0 8px 20px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;gap:8px;");
        var text = document.createElement('span');
        text.textContent = "আপনার পছন্দ সংরক্ষিত হয়েছে। ইতিমধ্যে চালু থাকা স্ক্রিপ্ট বন্ধ করতে পেজটি পুনরায় লোড করুন।";
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('style', "align-self:flex-start;background:#06b6d4;border:none;color:white;padding:7px 14px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;");
        btn.textContent = "পেজ পুনরায় লোড করুন";
        btn.onclick = function() { window.location.reload(); };
        notice.appendChild(text);
        notice.appendChild(btn);
        document.body.appendChild(notice);
      },

      isBdVisitor: function() {
        var geo = window.FrithX && window.FrithX.visitorGeo;
        if (geo && geo.country) return String(geo.country).toUpperCase() === 'BD';
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka';
        } catch (e) {
          return false;
        }
      },

      renderBanner: function() {
        const banner = document.createElement('div');
        banner.id = 'frithx-cookie-banner';
        banner.setAttribute('lang', "bn");
        banner.style = "position:fixed;bottom:24px;left:24px;max-width:400px;width:calc(100% - 48px);border-top:4px solid #06b6d4;background:#1E293B;color:#F1F5F9;padding:22px 24px;border-radius:14px;box-shadow:0 20px 40px rgba(0,0,0,0.45);z-index:99999;display:flex;flex-direction:column;gap:14px;transition:all 0.3s ease;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;box-sizing:border-box;";
        banner.innerHTML = this.optIn ? `

          <div id="frithx-banner-content" style="display:flex;flex-direction:column;gap:12px;">
            <div style="font-size:28px;line-height:1;margin-bottom:4px;">🍪</div>
            <h3 style="margin:0;font-size:17px;font-weight:700;line-height:1.3;color:#F1F5F9;">আমরা আপনার গোপনীয়তাকে গুরুত্ব দিই</h3>
            <p style="margin:0;font-size:14px;line-height:1.5;color:#F1F5F9;opacity:0.92;">ওয়েবসাইট চালু রাখতে আমরা অত্যাবশ্যক কুকি ব্যবহার করি। আপনি সম্মতি দিলে তবেই আমরা বিশ্লেষণ, বিপণন ও আপনার পছন্দ মনে রাখার জন্য কুকি ব্যবহার করব। আপনি যেকোনো সময় আপনার সম্মতি পরিবর্তন বা প্রত্যাহার করতে পারেন।</p>

            <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;">
          <button onclick="FrithXConsent.accept('all')" style="background:#06b6d4;border:none;color:white;padding:11px 18px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;width:100%;transition:all 0.2s;">সব কুকি গ্রহণ করুন</button>
          <button onclick="FrithXConsent.accept('reject')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#F1F5F9;padding:11px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;width:100%;">সব কুকি প্রত্যাখ্যান করুন</button>
          <button onclick="FrithXConsent.togglePreferences()" style="background:transparent;border:none;color:#06b6d4;padding:6px 0;cursor:pointer;font-size:14px;font-weight:500;text-decoration:underline;text-align:center;margin-top:2px;">পছন্দ পরিচালনা করুন</button>
        </div>
            <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12);font-size:12px;font-family:sans-serif;color:#F1F5F9;opacity:0.85;">
          <span>Powered by</span>
          <a href="https://www.frithx.com" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;text-decoration:none;vertical-align:middle;transition:opacity 0.2s;">
            <img src="https://frithx.com/images/white_blue_logo.png" alt="FrithX" style="height:16px;width:auto;vertical-align:middle;display:inline-block;" />
          </a>
        </div>
          </div>

          <div id="frithx-preferences-panel" style="display:none;flex-direction:column;gap:15px;border-top:1px solid rgba(255,255,255,0.12);padding-top:15px;font-size:14px;">
            <h4 style="margin:0;font-size:15px;font-weight:700;">সম্মতির পছন্দসমূহ</h4>


            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">অত্যাবশ্যক কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">ওয়েবসাইট চালু রাখার জন্য প্রয়োজনীয়।</span>
                </div>
                <input type="checkbox" checked disabled style="cursor:not-allowed;" />
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">বিশ্লেষণমূলক কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">ওয়েবসাইটের ট্রাফিক পরিমাপ ও বিশ্লেষণে আমাদের সাহায্য করে।</span>
                </div>
                <input type="checkbox" id="fx-pref-analytics" style="cursor:pointer;" />
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">বিপণন কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">প্রাসঙ্গিক বিজ্ঞাপন দেখানোর জন্য ব্যবহৃত হয়।</span>
                </div>
                <input type="checkbox" id="fx-pref-marketing" style="cursor:pointer;" />
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">কার্যকরী কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">আপনার সেটিংস ও ব্যক্তিগতকৃত পছন্দ মনে রাখে।</span>
                </div>
                <input type="checkbox" id="fx-pref-preferences" style="cursor:pointer;" />
              </div>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:5px;">
              <button onclick="FrithXConsent.togglePreferences()" style="background:transparent;border:none;color:#F1F5F9;opacity:0.8;padding:8px 16px;cursor:pointer;font-size:14px;">বাতিল</button>
              <button onclick="FrithXConsent.accept('reject')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#F1F5F9;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">সব কুকি প্রত্যাখ্যান করুন</button>
              <button onclick="FrithXConsent.savePreferences()" style="background:#06b6d4;border:none;color:white;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">পছন্দ সংরক্ষণ করুন</button>
            </div>
          </div>
        ` : `

          <div id="frithx-banner-content" style="display:flex;flex-direction:column;gap:12px;">
            <div style="font-size:28px;line-height:1;margin-bottom:4px;">🍪</div>
            <h3 style="margin:0;font-size:17px;font-weight:700;line-height:1.3;color:#F1F5F9;">আমরা আপনার গোপনীয়তাকে গুরুত্ব দিই</h3>
            <p style="margin:0;font-size:14px;line-height:1.5;color:#F1F5F9;opacity:0.92;">ওয়েবসাইট চালু রাখতে আমরা অত্যাবশ্যক কুকি ব্যবহার করি। আপনি সম্মতি দিলে তবেই আমরা বিশ্লেষণ, বিপণন ও আপনার পছন্দ মনে রাখার জন্য কুকি ব্যবহার করব। আপনি যেকোনো সময় আপনার সম্মতি পরিবর্তন বা প্রত্যাহার করতে পারেন।</p>

            <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;">
          <button onclick="FrithXConsent.accept('all')" style="background:#06b6d4;border:none;color:white;padding:11px 18px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;width:100%;transition:all 0.2s;">সব কুকি গ্রহণ করুন</button>
          <button onclick="FrithXConsent.accept('reject')" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#F1F5F9;padding:11px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;width:100%;">সব কুকি প্রত্যাখ্যান করুন</button>
          <button onclick="FrithXConsent.togglePreferences()" style="background:transparent;border:none;color:#06b6d4;padding:6px 0;cursor:pointer;font-size:14px;font-weight:500;text-decoration:underline;text-align:center;margin-top:2px;">পছন্দ পরিচালনা করুন</button>
        </div>
            <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12);font-size:12px;font-family:sans-serif;color:#F1F5F9;opacity:0.85;">
          <span>Powered by</span>
          <a href="https://www.frithx.com" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;text-decoration:none;vertical-align:middle;transition:opacity 0.2s;">
            <img src="https://frithx.com/images/white_blue_logo.png" alt="FrithX" style="height:16px;width:auto;vertical-align:middle;display:inline-block;" />
          </a>
        </div>
          </div>

          <div id="frithx-preferences-panel" style="display:none;flex-direction:column;gap:15px;border-top:1px solid rgba(255,255,255,0.12);padding-top:15px;font-size:14px;">
            <h4 style="margin:0;font-size:15px;font-weight:700;">সম্মতির পছন্দসমূহ</h4>


            <div style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">অত্যাবশ্যক কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">ওয়েবসাইট চালু রাখার জন্য প্রয়োজনীয়।</span>
                </div>
                <input type="checkbox" checked disabled style="cursor:not-allowed;" />
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">বিশ্লেষণমূলক কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">ওয়েবসাইটের ট্রাফিক পরিমাপ ও বিশ্লেষণে আমাদের সাহায্য করে।</span>
                </div>
                <input type="checkbox" id="fx-pref-analytics" style="cursor:pointer;" />
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">বিপণন কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">প্রাসঙ্গিক বিজ্ঞাপন দেখানোর জন্য ব্যবহৃত হয়।</span>
                </div>
                <input type="checkbox" id="fx-pref-marketing" style="cursor:pointer;" />
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <strong style="display:block;color:#F1F5F9;font-size:14px;">কার্যকরী কুকি</strong>
                  <span style="font-size:12px;color:#F1F5F9;opacity:0.75;">আপনার সেটিংস ও ব্যক্তিগতকৃত পছন্দ মনে রাখে।</span>
                </div>
                <input type="checkbox" id="fx-pref-preferences" style="cursor:pointer;" />
              </div>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:5px;">
              <button onclick="FrithXConsent.togglePreferences()" style="background:transparent;border:none;color:#F1F5F9;opacity:0.8;padding:8px 16px;cursor:pointer;font-size:14px;">বাতিল</button>
              <button onclick="FrithXConsent.savePreferences()" style="background:#06b6d4;border:none;color:white;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">পছন্দ সংরক্ষণ করুন</button>
            </div>
          </div>
        `;
        document.body.appendChild(banner);
      },

      // Persistent control to change or withdraw consent at any time (PDPA s.13(1))
      renderPrivacyChoices: function() {
        if (document.getElementById('frithx-privacy-choices')) return;
        var btn = document.createElement('button');
        btn.id = 'frithx-privacy-choices';
        btn.type = 'button';
        btn.setAttribute('lang', "bn");
        btn.setAttribute('style', "position:fixed;bottom:16px;left:16px;z-index:99998;background:#1E293B;color:#F1F5F9;border:1px solid rgba(255,255,255,0.2);border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;");
        btn.textContent = "গোপনীয়তার পছন্দ";
        btn.onclick = function() { window.FrithXConsent.openPreferences(); };
        document.body.appendChild(btn);
      },

      openPreferences: function() {
        var choicesBtn = document.getElementById('frithx-privacy-choices');
        if (choicesBtn) choicesBtn.remove();
        if (!document.getElementById('frithx-cookie-banner')) this.renderBanner();
        var stored = null;
        try {
          stored = JSON.parse(localStorage.getItem('fx_cookie_consent_choices') || 'null');
        } catch (e) {}
        if (stored) {
          ['analytics', 'marketing', 'preferences'].forEach(function(key) {
            var input = document.getElementById('fx-pref-' + key);
            if (input) input.checked = !!stored[key];
          });
        }
        var contentPanel = document.getElementById('frithx-banner-content');
        var prefPanel = document.getElementById('frithx-preferences-panel');
        if (contentPanel && prefPanel) {
          contentPanel.style.display = 'none';
          prefPanel.style.display = 'flex';
        }
      },

      togglePreferences: function() {
        const contentPanel = document.getElementById('frithx-banner-content');
        const prefPanel = document.getElementById('frithx-preferences-panel');
        if (contentPanel && prefPanel) {
          const isPrefOpen = prefPanel.style.display === 'flex';
          // Re-opened after a choice was already made: cancelling keeps that choice
          if (isPrefOpen && this.hasConsented) {
            const bannerEl = document.getElementById('frithx-cookie-banner');
            if (bannerEl) bannerEl.remove();
            if (this.optIn) this.renderPrivacyChoices();
            return;
          }
          contentPanel.style.display = isPrefOpen ? 'flex' : 'none';
          prefPanel.style.display = isPrefOpen ? 'none' : 'flex';
        }
      },

      savePreferences: function() {
        const analytics = document.getElementById('fx-pref-analytics').checked;
        const marketing = document.getElementById('fx-pref-marketing').checked;
        const preferences = document.getElementById('fx-pref-preferences').checked;

        const choices = {
          necessary: true,
          analytics: analytics,
          marketing: marketing,
          preferences: preferences
        };

        this.accept('custom', choices);
      },

      // Random per-browser id kept with the consent so a later withdrawal can be linked
      // to the earlier consent; the server stores only sha256(domain_id + id).
      visitorId: function() {
        var id = null;
        try {
          id = localStorage.getItem('fx_visitor_id');
          if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
            id = (window.crypto && crypto.randomUUID)
              ? crypto.randomUUID()
              : Array.from({ length: 4 }, function() { return Math.random().toString(36).slice(2, 10); }).join('');
            localStorage.setItem('fx_visitor_id', id);
          }
        } catch (e) {}
        return id;
      },

      accept: function(type, customChoices) {
        var previous = null;
        try {
          previous = this.hasConsented ? JSON.parse(localStorage.getItem('fx_cookie_consent_choices') || 'null') : null;
        } catch (e) {}
        localStorage.setItem('fx_cookie_consent', type);
        this.hasConsented = true;
        this.consentValue = type;
        const bannerEl = document.getElementById('frithx-cookie-banner');
        if (bannerEl) bannerEl.remove();

        const choices = customChoices || fxChoicesFor(type);

        localStorage.setItem('fx_cookie_consent_choices', JSON.stringify(choices));

        // Withdrawing any purpose consented to earlier (PDPA s.13, GDPR Art. 7(3))
        const withdrawal = !!previous && type !== 'all' &&
          ['analytics', 'marketing', 'preferences'].some(function(key) { return previous[key] && !choices[key]; });

        fxConsentModeUpdate(choices);

        // Log consent to FrithX GRC database
        fetch("https://api.frithx.com/api/consents", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain_id: "e4a9218d-2f5e-4a1b-ad67-0053b40faef8",
            org_id: "eb8cf11d-54f1-4f8a-b386-2c644c7f3759",
            domain_name: "pothikrit.org",
            consent_type: type === 'all' ? 'accept_all' : type === 'reject' ? 'reject_all' : 'custom',
            choices: choices,
            consent_version: this.optIn ? this.consentVersion + '-bd_pdpa' : this.consentVersion,
            visitor_id: this.visitorId(),
            withdrawal: withdrawal
          })
        }).catch(err => console.error("FrithX Consent Log Error:", err));

        this.activateTagged(document);
        const self = this;
        const stillRunning = ['analytics', 'marketing', 'preferences'].some(function(key) { return self.activated[key] && !choices[key]; });
        if (stillRunning) this.renderReloadNotice();
        if (this.optIn) this.renderPrivacyChoices();
        try {
          window.dispatchEvent(new CustomEvent('frithx-consent-changed', { detail: { choices: choices, withdrawal: withdrawal } }));
        } catch (e) {}
      },

      // Kept for pages that call it directly: activates whatever the stored choice allows
      triggerTracking: function() {
        this.activateTagged(document);
      }
    };

    // Loaded with async/defer or by a tag manager, the document may already be parsed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => window.FrithXConsent.init());
    } else {
      window.FrithXConsent.init();
    }
  })();
