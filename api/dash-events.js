/**
 * /api/dash-events — the dashboard's window into the Airtable calendar.
 * Team login required. Airtable is the single authoritative calendar:
 *
 *   GET    -> all records of the calendar table (incl. unpublished),
 *             mapped to the same shape the public website displays.
 *   POST   -> create one record (body: event fields) — returns its ID.
 *   PATCH  -> update the record with body.id (never creates a duplicate).
 *   DELETE -> delete the record with body.id.
 *
 * Writes go to the table's base fields (Title, Start Time, ...); the public
 * feed (/api/calendar-events) prefers "Public *" overrides when present and
 * falls back to these — exactly how the live site already behaves.
 *
 * Credentials live only in Vercel env vars: AIRTABLE_API_TOKEN (needs
 * data.records read+write on the base), AIRTABLE_BASE_ID,
 * AIRTABLE_CALENDAR_TABLE (optional).
 */
var lib = require('./_dashlib');
var crypto = require('node:crypto');
var eventModel=require('../public/event-model');

var TZ = 'America/Los_Angeles';

function airtableConfig() {
  var token = process.env.AIRTABLE_API_TOKEN;
  var baseId = process.env.AIRTABLE_BASE_ID;
  if (!token || !baseId) return null;
  return { token: token, baseId: baseId, table: process.env.AIRTABLE_CALENDAR_TABLE || 'tblIqFjxxfbOgwuQu' };
}

async function at(cfg, path, options) {
  var opts = options || {};
  var headers = { 'Authorization': 'Bearer ' + cfg.token, 'Content-Type': 'application/json' };
  Object.keys(opts.headers || {}).forEach(function (k) { headers[k] = opts.headers[k]; });
  return fetch('https://api.airtable.com/v0/' + cfg.baseId + '/' + encodeURIComponent(cfg.table) + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body,
  });
}

/* ---- timezone helpers (no libraries) ---- */
function tzOffsetMs(tz, utcMs) {
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  var p = {};
  parts.forEach(function(x) { p[x.type] = x.value; });
  var asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

function parseTimeToHM(str) {
  if (!str) return null;
  var s = String(str).trim();
  var m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  var h = parseInt(m[1], 10);
  var min = m[2] ? parseInt(m[2], 10) : 0;
  var ap = m[3] ? m[3].toUpperCase() : null;
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h: h, min: min };
}

/** "2026-11-01" + "7:00 PM" in America/Los_Angeles -> UTC ISO string. */
function zonedToIso(dateStr, timeStr) {
  var d = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var t = parseTimeToHM(timeStr);
  if (!d || !t) return null;
  var guess = Date.UTC(+d[1], +d[2] - 1, +d[3], t.h, t.min, 0);
  var utc = guess - tzOffsetMs(TZ, guess);
  utc = guess - tzOffsetMs(TZ, utc); // re-check across DST edges
  return new Date(utc).toISOString();
}

function fmtDate(iso) {
  var dt = new Date(iso);
  if (isNaN(dt.getTime())) return '';
  var parts = dt.toLocaleDateString('en-CA', { timeZone: TZ }).split('-');
  return parts[0] + '-' + parts[1] + '-' + parts[2];
}
function fmtTime(iso) {
  var dt = new Date(iso);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
}

function mapRecord(record) {
  var f = record.fields || {};
  var startRaw = f['Public Start Time'] || f['Start Time'] || f['Date'] || '';
  var endRaw = f['Public End Time'] || f['End Time'] || '';
  var img = null;
  var att = f['Image'] || f['Public Image'];
  if (Array.isArray(att) && att.length) img = att[0].url || null;
  return {
    id: record.id,
    version:crypto.createHash('sha256').update(JSON.stringify(Object.keys(f).sort().map(function(key){return [key,f[key]];}))).digest('hex'),
    title: f['Public Title'] || f['Title'] || f['Name'] || '',
    date: startRaw ? fmtDate(startRaw) : '',
    startTime: startRaw ? fmtTime(startRaw) : '',
    endTime: endRaw ? fmtTime(endRaw) : '',
    location: f['Public Location'] || f['Location'] || '',
    description: f['Public Description'] || f['Description'] || '',
    type: f['Public Type'] || f['Type'] || '',
    price: f['Public Price'] || f['Price'] || '',
    rsvpUrl: f['Public RSVP Link'] || f['RSVP Link'] || f['RSVP URL'] || '',
    publish: f['Publish'] === true,
    image: img,
  };
}

function buildFields(body) {
  var fields = {};
  if (body.title !== undefined) fields['Title'] = String(body.title || '');
  if (body.date !== undefined) {
    var startIso = zonedToIso(body.date, body.startTime || '12:00 PM');
    if (startIso) fields['Start Time'] = startIso;
    if (body.endTime) {
      var endIso = zonedToIso(body.date, body.endTime);
      if (endIso) fields['End Time'] = endIso;
    } else if(body.endTime==='')fields['End Time']=null;
  }
  if (body.location !== undefined) fields['Location'] = String(body.location || '');
  if (body.description !== undefined) fields['Description'] = String(body.description || '');
  if (body.type !== undefined) fields['Type'] = String(body.type || '');
  if (body.price !== undefined) fields['Price'] = String(body.price || '');
  if (body.rsvpUrl !== undefined) fields['RSVP Link'] = String(body.rsvpUrl || '');
  if (body.publish !== undefined) fields['Publish'] = body.publish === true;
  return fields;
}

/** Fallback used when this Vercel project has no Airtable keys yet:
 *  read the published events from the LIVE site's existing feed
 *  (saneliving.com runs the same code with the keys in its project).
 *  Read-only: managing events still requires the Airtable token. */
var LIVE_FEED = process.env.LIVE_EVENTS_FEED_URL || 'https://saneliving.com/api/calendar-events';
async function readOnlyEvents() {
  var resp = await fetch(LIVE_FEED);
  if (!resp.ok) throw new Error('live feed HTTP ' + resp.status);
  var data = await resp.json();
  try{var past=await fetch(process.env.LIVE_PAST_EVENTS_FEED_URL||new URL('/api/calendar-events-past',LIVE_FEED).href);if(past.ok){var archive=await past.json();var ids=new Set((data.events||[]).map(function(e){return e.id;}));data.events=(data.events||[]).concat((archive.events||[]).filter(function(e){return !ids.has(e.id);}));}}catch(e){}
  return (data.events || []).map(function (e) {
    return {
      id: e.id, title: e.title || '', date: e.date || '',
      startTime: e.startTime || '', endTime: e.endTime || '',
      location: e.location || '', description: e.description || '',
      type: e.type || '', price: e.price || '', rsvpUrl: e.rsvpUrl || '',
      publish: true, image: e.image ? (e.image.url || null) : null,
    };
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control','private, no-store');
  if(!['GET','POST','PATCH','DELETE'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  if (!lib.requireLogin(req, res)) return;
  var cfg = airtableConfig();
  if (!cfg) {
    if (req.method === 'GET') {
      try {
        var evts = await readOnlyEvents();
        return res.status(200).json({ connected: false, readOnly: true, source: 'live-site', events: evts, count: evts.length });
      } catch (feedErr) {
        return res.status(503).json({
          error: 'Airtable is not connected yet — the AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID keys have not been added in Vercel.',
          code: 'AIRTABLE_NOT_CONFIGURED',
        });
      }
    }
    return res.status(503).json({
      error: 'Airtable is not connected yet — the AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID keys have not been added in Vercel.',
      code: 'AIRTABLE_NOT_CONFIGURED',
    });
  }
  try {
    if (req.method === 'GET') {
      var records = [];
      var offset = null;
      do {
        var qs = new URLSearchParams({ pageSize: '100' });
        if (offset) qs.append('offset', offset);
        var resp = await at(cfg, '?' + qs.toString());
        if (!resp.ok) {
          var errText = await resp.text();
          return res.status(502).json({ error: 'Airtable could not be read.', detail: errText.slice(0, 300) });
        }
        var data = await resp.json();
        records = records.concat(data.records || []);
        offset = data.offset || null;
      } while (offset);
      var events = records.map(mapRecord);
      events.sort(function(a, b) { return (a.date || '9999') < (b.date || '9999') ? -1 : 1; });
      return res.status(200).json({ connected: true, events: events, count: events.length });
    }
    if (req.method === 'POST' || req.method === 'PATCH') {
      var body = lib.readJsonBody(req);
      if(!body||typeof body!=='object')return res.status(400).json({error:'Send an event object.'});
      if(body.date!==undefined&&(!eventModel.validDate(body.date)||!body.date||!parseTimeToHM(body.startTime||'12 PM')||body.endTime&&!parseTimeToHM(body.endTime)))return res.status(400).json({error:'Use a valid date and time, for example 2026-12-20 and 6:00 PM.'});
      if(body.rsvpUrl&&!eventModel.safeUrl(body.rsvpUrl))return res.status(400).json({error:'Use an HTTPS RSVP URL or a local path.'});
      if(body.id&&!/^rec[A-Za-z0-9]+$/.test(body.id))return res.status(400).json({error:'Invalid Airtable record id.'});
      var fields = buildFields(body);
      if(body.id){var currentResponse=await at(cfg,'/'+encodeURIComponent(body.id));if(!currentResponse.ok)return res.status(502).json({error:'The current Airtable event could not be checked. Your work is kept.'});var currentRecord=await currentResponse.json();if(body.expectedVersion&&mapRecord(currentRecord).version!==body.expectedVersion)return res.status(409).json({error:'This event changed in Airtable. Reload the calendar before saving; your work is kept.'});
        var overrides={'title':'Title','location':'Location','description':'Description','type':'Type','price':'Price','rsvpUrl':'RSVP Link'};for(var key of Object.keys(overrides)){var override=currentRecord.fields&&currentRecord.fields['Public '+overrides[key]];if(body[key]!==undefined&&override&&String(override)!==String(currentRecord.fields[overrides[key]]||'')&&String(override)!==String(body[key]))return res.status(409).json({error:'The Airtable Public '+overrides[key]+' override controls this website value. Resolve that override in Airtable before changing it here. Your work is kept.'});}}
      if (req.method === 'POST') {
        if (!fields['Title']) return res.status(400).json({ error: 'An event needs a title.' });
        if (!fields['Start Time']) return res.status(400).json({ error: 'An event needs a valid date and start time.' });
        var cResp = await at(cfg, '', { method: 'POST', body: JSON.stringify({ records: [{ fields: fields }], typecast: true }) });
        if (!cResp.ok) { var cErr = await cResp.text(); return res.status(502).json({ error: 'Airtable refused the new event.', detail: cErr.slice(0, 300) }); }
        var created = await cResp.json();
        return res.status(200).json({ ok: true, event: mapRecord(created.records[0]) });
      }
      if (!body.id) return res.status(400).json({ error: 'Missing event id.' });
      var uResp = await at(cfg, '', { method: 'PATCH', body: JSON.stringify({ records: [{ id: String(body.id), fields: fields }], typecast: true }) });
      if (!uResp.ok) { var uErr = await uResp.text(); return res.status(502).json({ error: 'Airtable refused the update.', detail: uErr.slice(0, 300) }); }
      var updated = await uResp.json();
      return res.status(200).json({ ok: true, event: mapRecord(updated.records[0]) });
    }
    if (req.method === 'DELETE') {
      var dBody = lib.readJsonBody(req);
      if (!dBody.id||!/^rec[A-Za-z0-9]+$/.test(dBody.id)) return res.status(400).json({ error: 'Missing event id.' });
      if(dBody.expectedVersion){var dCurrent=await at(cfg,'/'+encodeURIComponent(dBody.id));if(!dCurrent.ok)return res.status(502).json({error:'The current event could not be checked.'});if(mapRecord(await dCurrent.json()).version!==dBody.expectedVersion)return res.status(409).json({error:'This event changed in Airtable. Reload before deleting it.'});}
      var dResp = await at(cfg, '?records[]=' + encodeURIComponent(String(dBody.id)), { method: 'DELETE' });
      if (!dResp.ok) { var dErr = await dResp.text(); return res.status(502).json({ error: 'Airtable refused the delete.', detail: dErr.slice(0, 300) }); }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('dash-events error:', err);
    return res.status(500).json({ error: 'Events service failed unexpectedly.' });
  }
};
