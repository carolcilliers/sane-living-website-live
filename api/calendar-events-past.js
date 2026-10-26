/**
 * GET /api/calendar-events-past
 *
 * Fetches past events from the calendar-specific Airtable table.
 */

var eventModel=require('../public/event-model');
var eventStories=require('../public/content/event-stories.json');
var login=require('./_dashlib');
module.exports = async function handler(req, res) {
  req.query=req.query||{};
  if(req.query.debug){res.setHeader('Cache-Control','private, no-store');if(!login.requireLogin(req,res))return;}
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var token = process.env.AIRTABLE_API_TOKEN;
  var baseId = process.env.AIRTABLE_BASE_ID;
  var table = process.env.AIRTABLE_CALENDAR_TABLE || 'tblIqFjxxfbOgwuQu';

  if (!token || !baseId) {
    return res.status(500).json({ error: 'Airtable configuration missing' });
  }

  try {
    var params = new URLSearchParams();
    if (req.query.debug !== '2') {
      params.append('filterByFormula', '{Publish} = TRUE()');
    }
    // Fetch more records for the archive
    params.append('pageSize','100');

    var url = 'https://api.airtable.com/v0/' + baseId + '/' + encodeURIComponent(table) + '?' + params.toString();

    var response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
    });

    if (!response.ok) {
      var errorBody = await response.text();
      console.error('Airtable calendar API error:', response.status, errorBody);
      return res.status(502).json({ error: 'Failed to fetch calendar events', status: response.status, detail: errorBody });
    }

    var data = await response.json();
    var offsets=new Set();while(data.offset){if(offsets.has(data.offset))throw Error('Repeated Airtable page offset');offsets.add(data.offset);params.set('offset',data.offset);var next=await fetch('https://api.airtable.com/v0/'+baseId+'/'+encodeURIComponent(table)+'?'+params.toString(),{headers:{Authorization:'Bearer '+token}});if(!next.ok)throw Error('The next Airtable page could not be read');var page=await next.json();data.records=(data.records||[]).concat(page.records||[]);data.offset=page.offset;}

    // Debug mode: return raw field names
    if (req.query.debug === '1') {
      var fieldNames = {};
      (data.records || []).forEach(function(r) {
        Object.keys(r.fields).forEach(function(k) { fieldNames[k] = typeof r.fields[k]; });
      });
      return res.status(200).json({ fieldNames: fieldNames, sampleRecord: data.records[0] });
    }

    var now = new Date();
    var todayStr = eventModel.today();

    var events = (data.records || []).map(function(record) {
      var f = record.fields;

      var TZ = 'America/Los_Angeles';

      var date = '';
      var startTime = '';
      var startField = f['Public Start Time'] || f['Start Time'] || f['Date'] || '';
      if (startField) {
        var dt = new Date(startField);
        if (!isNaN(dt.getTime())) {
          // Extract date in local timezone, not UTC
          var parts = dt.toLocaleDateString('en-CA', { timeZone: TZ }).split('-');
          date = parts[0] + '-' + parts[1] + '-' + parts[2];
          startTime = dt.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
            timeZone: TZ,
          });
        }
      }

      var endTime = '';
      var endField = f['Public End Time'] || f['End Time'] || '';
      if (endField) {
        var et = new Date(endField);
        if (!isNaN(et.getTime())) {
          endTime = et.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
            timeZone: TZ,
          });
        }
      }

      return {
        id: record.id,
        title: f['Public Title'] || f['Title'] || f['Name'] || '',
        date: date,
        startTime: startTime,
        endTime: endTime,
        description: f['Public Description'] || f['Description'] || '',
        blurb: f['Public Blurb'] || f['Blurb'] || '',
        location: f['Public Location'] || f['Location'] || 'Sane Living Center',
        type: (f['Public Type'] || f['Type'] || 'Free').toLowerCase(),
        price: f['Public Price'] || f['Price'] || '',
        rsvpUrl: f['Public RSVP Link'] || f['RSVP Link'] || f['RSVP URL'] || '',
        pageLink: f['Public Page Link'] || f['Page Link'] || '',
        image: extractImage(f['Image'] || f['Public Image']),
      };
    }).filter(function(evt) {
      // KEEP events that have a date AND that date is BEFORE today (i.e., in the past)
      return evt.title && evt.date && evt.date < todayStr;
    });

    // Sort in reverse chronological order (newest past events first)
    events=events.map(function(event){return eventModel.enrich(event,eventStories);});
    events.sort(function(a, b) {
      return a.date > b.date ? -1 : a.date < b.date ? 1 : 0;
    });

    res.setHeader('Cache-Control', req.query.debug?'private, no-store':'s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ events: events });
  } catch (err) {
    console.error('Calendar events API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Extracts image URL from Airtable attachment field.
 */
function extractImage(attachments) {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }
  var att = attachments[0];
  return {
    url: att.url || '',
    thumbnail: (att.thumbnails && att.thumbnails.large && att.thumbnails.large.url) || att.url || '',
  };
}
