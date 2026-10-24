/* Riviraa Desk cloud sync — opt-in, private contacts first. */
(function () {
  'use strict';
  const CFG_KEY = 'riviraa-desk-supabase-config-v1';
  const CLIENT_KEY = 'riviraa-desk-browser-id-v1';
  let client = null, session = null, busy = false;
  const css = `
  #riviraaCloud{margin:0 0 16px;padding:16px;border:1px solid #dce5f4;border-radius:16px;background:#fff;box-shadow:0 5px 18px #202c5009}
  #riviraaCloud h2{margin:0 0 8px;font-size:18px;color:#17213e}
  #riviraaCloud p{margin:5px 0;color:#687795;font-size:12px;line-height:1.5}
  #riviraaCloud .cloudgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  #riviraaCloud label{display:block;color:#53617e;font-size:12px;font-weight:700;margin:8px 0 5px}
  #riviraaCloud input{width:100%;min-width:0;padding:10px;border:1px solid #dbe3f1;border-radius:9px}
  #riviraaCloud .cloudactions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  #riviraaCloud button{border:0;border-radius:9px;padding:10px 13px;background:#5747df;color:white;font-weight:700;cursor:pointer}
  #riviraaCloud button.secondary{background:#edf0fb;color:#27335c}
  #riviraaCloud button:disabled{opacity:.55;cursor:wait}
  #riviraaCloud .cloudstatus{margin-top:10px;padding:10px 12px;background:#f5f7fc;border-radius:9px;color:#344260;font-size:12px;white-space:pre-wrap}
  #riviraaCloud .cloudwarning{color:#8b4a00}
  @media(max-width:600px){#riviraaCloud .cloudgrid{grid-template-columns:1fr}}
  `;
  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k,v]) => k === 'class' ? n.className=v : n.setAttribute(k,v));
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function config() { try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (_) { return {}; } }
  function status(message, warning) {
    const n = document.getElementById('riviraaCloudStatus');
    if (n) { n.textContent = message; n.className = 'cloudstatus' + (warning ? ' cloudwarning' : ''); }
  }
  function setBusy(v) { busy = v; document.querySelectorAll('#riviraaCloud button').forEach(b => b.disabled = v); }
  function buildUI() {
    if (document.getElementById('riviraaCloud')) return;
    const style = el('style'); style.textContent = css; document.head.appendChild(style);
    const box = el('section', {id:'riviraaCloud'}, `
      <h2>☁️ Secure Cloud Backup & Sync</h2>
      <p>Optional cloud sync for your <b>private contacts</b>. Your existing browser contacts are not uploaded until you choose “Back up & sync”. Use only your Supabase Project URL and <b>publishable</b> key here. Never enter a secret/service-role key. The password is the one each person creates for their Riviraa Desk login; it is not your Supabase dashboard password. For security, passwords cannot be viewed by the app owner.</p>
      <div id="riviraaCloudConfig">
        <div class="cloudgrid">
          <div><label for="riviraaSupabaseUrl">Supabase Project URL</label><input id="riviraaSupabaseUrl" placeholder="https://your-project.supabase.co" autocomplete="url"></div>
          <div><label for="riviraaSupabaseKey">Supabase publishable key</label><input id="riviraaSupabaseKey" placeholder="sb_publishable_..." autocomplete="off" spellcheck="false"></div>
        </div>
        <div class="cloudgrid">
          <div><label for="riviraaCloudEmail">Account email</label><input id="riviraaCloudEmail" type="email" placeholder="you@example.com" autocomplete="username"></div>
          <div><label for="riviraaCloudPassword">Password</label><input id="riviraaCloudPassword" type="password" placeholder="Riviraa Desk account password" autocomplete="current-password"></div>
        </div>
        <div class="cloudactions">
          <button id="riviraaSaveConfig" type="button">Save connection settings</button>
          <button id="riviraaSignIn" class="secondary" type="button">Sign in</button>
          <button id="riviraaSignUp" class="secondary" type="button">Create account</button>
        </div>
      </div>
      <div id="riviraaCloudAccount" hidden>
        <p id="riviraaCloudSignedIn"></p>
        <div class="cloudactions">
          <button id="riviraaSync" type="button">Back up & sync private contacts</button>
          <button id="riviraaUsersButton" class="secondary" type="button">Admin: User management</button>
          <button id="riviraaSignOut" class="secondary" type="button">Sign out</button>
          <button id="riviraaEditConfig" class="secondary" type="button">Connection settings</button>
        </div>
        <div id="riviraaAdminPanel" hidden style="margin-top:14px;border-top:1px solid #e4eaf5;padding-top:14px">
          <h2>👥 User Management</h2>
          <p>Admins can view registered account emails, roles and account dates. Passwords are never visible to anyone. Use Supabase’s secure password reset process if a user needs help.</p>
          <div class="cloudactions"><button id="riviraaRefreshUsers" class="secondary" type="button">Refresh user list</button></div>
          <div id="riviraaUsersList" class="cloudstatus">Click refresh to load users.</div>
        </div>
      </div>
      <div id="riviraaCloudStatus" class="cloudstatus">Not connected. Save your Supabase URL and publishable key to begin.</div>
      <p class="cloudwarning">Important: first sync uploads local contacts marked as private to the signed-in account. Workspace sharing is not enabled by this first sync button. Keep using Import / Export → Backup as an independent backup.</p>
    `);
    const main = document.querySelector('main');
    if (main) main.insertBefore(box, main.firstChild);
    const c = config();
    document.getElementById('riviraaSupabaseUrl').value = c.url || 'https://zrvvgbadaflimatervsz.supabase.co';
    document.getElementById('riviraaSupabaseKey').value = c.key || '';
    document.getElementById('riviraaSaveConfig').addEventListener('click', saveConfig);
    document.getElementById('riviraaSignIn').addEventListener('click', signIn);
    document.getElementById('riviraaSignUp').addEventListener('click', signUp);
    document.getElementById('riviraaSync').addEventListener('click', syncPrivate);
    document.getElementById('riviraaSignOut').addEventListener('click', signOut);
    document.getElementById('riviraaUsersButton').addEventListener('click', () => {
      const panel = document.getElementById('riviraaAdminPanel');
      panel.hidden = !panel.hidden;
      if (!panel.hidden) loadAdminUsers();
    });
    document.getElementById('riviraaRefreshUsers').addEventListener('click', loadAdminUsers);
    document.getElementById('riviraaEditConfig').addEventListener('click', () => {
      document.getElementById('riviraaCloudConfig').hidden = false;
      document.getElementById('riviraaCloudAccount').hidden = true;
    });
    updateAuthUI();
  }
  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => window.supabase && window.supabase.createClient ? resolve() : reject(new Error('Supabase library did not load.'));
      s.onerror = () => reject(new Error('Could not load Supabase client library. Check internet connection.'));
      document.head.appendChild(s);
    });
  }
  async function connect() {
    const c = config();
    if (!c.url || !c.key) throw new Error('Enter your Supabase Project URL and publishable key, then save settings.');
    await loadSdk();
    if (!client || client.__riviraaUrl !== c.url || client.__riviraaKey !== c.key) {
      client = window.supabase.createClient(c.url, c.key, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      client.__riviraaUrl = c.url; client.__riviraaKey = c.key;
      const {data, error} = await client.auth.getSession();
      if (error) throw error;
      session = data.session;
      client.auth.onAuthStateChange((_event, s) => { session = s; updateAuthUI(); });
    }
    return client;
  }
  function saveConfig() {
    const url = document.getElementById('riviraaSupabaseUrl').value.trim().replace(/\/$/,'');
    const key = document.getElementById('riviraaSupabaseKey').value.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return status('Please enter the full Supabase project URL, for example https://your-project.supabase.co', true);
    if (!key || !/^(sb_publishable_|eyJ)/.test(key)) return status('Enter the Supabase publishable key (sb_publishable_...). Do not use a secret/service-role key.', true);
    localStorage.setItem(CFG_KEY, JSON.stringify({url,key}));
    client = null;
    status('Connection settings saved in this browser. Next, sign in or create an account.', false);
  }
  async function signIn() {
    if (busy) return; setBusy(true);
    try {
      const c = await connect();
      const email = document.getElementById('riviraaCloudEmail').value.trim();
      const password = document.getElementById('riviraaCloudPassword').value;
      if (!email || !password) throw new Error('Enter your account email and password.');
      const {data,error} = await c.auth.signInWithPassword({email,password});
      if (error) throw error; session = data.session; updateAuthUI();
      status('Signed in. Your local contacts have not been uploaded yet. Choose “Back up & sync private contacts” when ready.', false);
    } catch(e) { status(e.message || String(e), true); } finally { setBusy(false); }
  }
  async function signUp() {
    if (busy) return; setBusy(true);
    try {
      const c = await connect();
      const email = document.getElementById('riviraaCloudEmail').value.trim();
      const password = document.getElementById('riviraaCloudPassword').value;
      if (!email || !password || password.length < 8) throw new Error('Enter an email and a password with at least 8 characters.');
      const {data,error} = await c.auth.signUp({email,password,options:{emailRedirectTo:location.origin + location.pathname}});
      if (error) throw error;
      if (data.session) { session=data.session; updateAuthUI(); status('Account created and signed in. You can now back up & sync.',false); }
      else status('Account created. Check your email to confirm the account, then return here and sign in.',false);
    } catch(e) { status(e.message || String(e), true); } finally { setBusy(false); }
  }
  async function signOut() {
    if (!client || busy) return; setBusy(true);
    try { const {error}=await client.auth.signOut(); if(error)throw error; session=null; updateAuthUI(); status('Signed out. Local contacts remain on this device.',false); }
    catch(e){status(e.message||String(e),true)} finally{setBusy(false)}
  }
  function updateAuthUI() {
    const account = document.getElementById('riviraaCloudAccount'), configBox = document.getElementById('riviraaCloudConfig');
    if (!account || !configBox) return;
    const signed = !!session && !!session.user;
    account.hidden = !signed; configBox.hidden = signed;
    const label = document.getElementById('riviraaCloudSignedIn');
    if (label) label.textContent = 'Signed in as ' + session.user.email + '. Cloud sync is manual; no background upload runs.';
  }
  async function loadAdminUsers() {
    const target = document.getElementById('riviraaUsersList');
    if (!target) return;
    target.textContent = 'Checking administrator access…';
    try {
      const c = await connect();
      const {data:{user},error:userError} = await c.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Please sign in again.');
      const {data:me,error:meError} = await c.from('profiles').select('id,email,role').eq('id',user.id).maybeSingle();
      if (meError) throw meError;
      if (!me || me.role !== 'admin') {
        target.textContent = 'Admin access is not enabled for this account yet. Run supabase-admin-setup.sql in Supabase SQL Editor, then promote your own email to role admin using the final SQL statement in that file. Also expose public.profiles in Data API Settings.';
        return;
      }
      const {data:rows,error} = await c.from('profiles').select('id,email,role,created_at').order('created_at',{ascending:false});
      if (error) throw error;
      target.replaceChildren();
      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;min-width:0;background:#fff';
      const head = document.createElement('thead'), hr = document.createElement('tr');
      ['Email','Role','Account date'].forEach(label => { const th=document.createElement('th'); th.textContent=label; th.style.cssText='text-align:left;padding:9px;border-bottom:1px solid #e4eaf5'; hr.appendChild(th); });
      head.appendChild(hr); table.appendChild(head);
      const body=document.createElement('tbody');
      (rows||[]).forEach(row => {
        const tr=document.createElement('tr');
        [row.email||'—',row.role||'user',row.created_at?new Date(row.created_at).toLocaleDateString():'—'].forEach(value=>{const td=document.createElement('td');td.textContent=value;td.style.cssText='padding:9px;border-bottom:1px solid #edf0f6;overflow-wrap:anywhere';tr.appendChild(td);});
        body.appendChild(tr);
      });
      table.appendChild(body); target.appendChild(table);
      if (!rows || !rows.length) target.textContent='No registered accounts found yet.';
    } catch(e) {
      target.textContent='Could not load user list: '+(e.message||String(e))+'. Check that public.profiles is exposed in Data API Settings and its setup SQL has been run.';
    }
  }
  function toCloud(c, userId, workspaceId) {
    const tags = Array.isArray(c.tags) ? c.tags : String(c.tags || '').split(',').map(x=>x.trim()).filter(Boolean);
    return {owner_id:userId,workspace_id:workspaceId||null,full_name:c.fullName||'',workspace:c.workspace||'',phone:c.phone||'',state:c.state||'',district_city:c.district||'',dob:c.dob||null,gender:c.gender||'',game_course:c.game||'',category:c.category||'',status:c.status||'New',follow_up_date:c.followup||null,follow_up_action:c.followupAction||'',tags,notes:c.notes||'',updated_at:new Date().toISOString()};
  }
  function fromCloud(r, existing) {
    const c = {cloudId:r.id,fullName:r.full_name||'',workspace:r.workspace||'MGA',phone:r.phone||'',state:r.state||'',district:r.district_city||'',dob:r.dob||'',gender:r.gender||'',game:r.game_course||'',category:r.category||'',status:r.status||'New',followup:r.follow_up_date||'',followupAction:r.follow_up_action||'',tags:Array.isArray(r.tags)?r.tags.join(', '):(r.tags||''),notes:r.notes||'',createdAt:r.created_at?new Date(r.created_at).getTime():Date.now()};
    if (existing && existing.id != null) c.id = existing.id;
    return c;
  }
  async function syncPrivate() {
    if (busy) return;
    if (!confirm('Back up & sync now? This uploads local contacts to your signed-in Supabase account and downloads your private cloud contacts to this browser. It does not delete local contacts. Continue?')) return;
    setBusy(true);
    try {
      const c = await connect();
      const {data:{user},error:userErr}=await c.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error('Please sign in first.');
      const local = await all();
      const {data:remote,error:readErr}=await c.from('contacts').select('*').eq('owner_id',user.id).is('workspace_id',null);
      if (readErr) throw readErr;
      const remoteRows = remote || [];
      const remoteById = new Map(remoteRows.map(r=>[String(r.id),r]));
      // Cross-device matching: older local records may not yet have cloudId.
      const normPhone = v => String(v||'').replace(/\\D/g,'');
      const normName = v => String(v||'').trim().toLocaleLowerCase();
      const samePerson = (a,b) => {
        const ap=normPhone(a.phone), bp=normPhone(b.phone);
        return !!ap && ap===bp && normName(a.fullName||a.full_name)===normName(b.fullName||b.full_name);
      };
      let uploaded=0, downloaded=0, skipped=0, matched=0;
      for (const original of local) {
        const item = {...original};
        // The first sync is intentionally private-only. Do not overwrite workspace-linked records.
        if (item.cloudWorkspaceId) { skipped++; continue; }
        const payload = toCloud(item,user.id,null);
        let existing = item.cloudId ? remoteById.get(String(item.cloudId)) : null;
        if (!existing) existing = remoteRows.find(r=>samePerson(item,r));
        if (existing) {
          item.cloudId = existing.id;
          await put(item);
          if (String(existing.id)===String(item.cloudId)) {
            const {error}=await c.from('contacts').update(payload).eq('id',existing.id).eq('owner_id',user.id).is('workspace_id',null);
            if(error) throw error;
            matched++;
          }
        } else {
          const {data,error}=await c.from('contacts').insert(payload).select('id').single();
          if(error) throw error;
          item.cloudId=data.id;
          await put(item);
          uploaded++;
        }
      }
      // Re-read after uploads; match by cloud ID first, then name+phone so existing device contacts are not duplicated.
      const {data:latest,error:latestErr}=await c.from('contacts').select('*').eq('owner_id',user.id).is('workspace_id',null);
      if(latestErr) throw latestErr;
      const localAfter = await all();
      for (const row of (latest||[])) {
        let match = localAfter.find(x=>String(x.cloudId||'')===String(row.id));
        if (!match) match = localAfter.find(x=>!x.cloudId && samePerson(x,row));
        if (!match) { await put(fromCloud(row,null)); downloaded++; }
        else if (!match.cloudId) { match.cloudId=row.id; await put(match); }
      }
      if (typeof render === 'function') await render();
      if (typeof analytics === 'function' && !document.getElementById('analytics').classList.contains('hidden')) await analytics();
      if (typeof renderBulkRecipients === 'function' && !document.getElementById('bulk').classList.contains('hidden')) await renderBulkRecipients();
      status('Sync complete. Uploaded/updated local contacts: '+uploaded+'. Downloaded cloud-only contacts: '+downloaded+'. Skipped workspace-linked contacts: '+skipped+'. No local contacts were deleted.',false);
    } catch(e) {
      status('Sync stopped safely: '+(e.message||String(e))+'. Local contacts were not intentionally deleted. If a permission error appears, stop here and share only the error text.',true);
    } finally { setBusy(false); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    buildUI();
    const c=config();
    if(c.url && c.key) connect().then(()=>{ if(session) updateAuthUI(); }).catch(e=>status(e.message||String(e),true));
  });
})();