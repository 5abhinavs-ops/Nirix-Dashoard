/**
 * Nirix Dashboard — Populate Fleet Tech Spec Sheet
 * Run this in Google Apps Script at https://script.google.com
 * Logged into: sg.tech.portal@gmail.com
 * Target Sheet ID: 1tj-SEY7syMVY5mHhn4hYT7Ej6z_Z2pTmrSzN3wYJk4c
 * Target Tab: Fleet Tech Spec
 *
 * Layout: Row 1 = header (Field + boat names), Col A = field labels, B+ = values
 * SG Shipping boats: cols B-M (12 boats)
 * Sea Cabbie boats:  cols N-X (11 boats)
 */

function populateFleetTechSpec() {
  const TARGET_SHEET_ID = '1tj-SEY7syMVY5mHhn4hYT7Ej6z_Z2pTmrSzN3wYJk4c';
  const TAB_NAME = 'Fleet Tech Spec';

  const ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  let sheet = ss.getSheetByName(TAB_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME);
    Logger.log('Created tab: ' + TAB_NAME);
  } else {
    sheet.clearContents();
    sheet.clearFormats();
    Logger.log('Cleared and repopulating tab: ' + TAB_NAME);
  }

  // ── DATA (copied from old Sheet — Data tab) ────────────────────────────────
  // Row 0 = header: Field | SG Shipping boats (12) | Sea Cabbie boats (11)
  // Rows 1+ = one field per row with all boat values

  const data = [
    ["Field","Galaxy","SG Brave","SG Fortune","SG Justice","SG Patience","SG Loyalty","SG Generous","SG Integrity","SG Dahlia","SG Sunflower","SG Jasmine","SG Marigold","SG Ekam","SG Naav","SG Dve","KM Golf","SG Panch","SG Chatur","SG Sapta","SG Ashta","SG Trinee","Vayu1","Vayu2"],
    ["Hull SC Number","SG SHIPPING Galaxy Fiberglass SC 4732I","SG Brave Aluminium SC 4242D","SG Fortune Aluminium SC 3822B","SG Justice Aluminium SC 4222Z","SG Patience Aluminium SC 4235A","SG Loyalty Aluminium SR 3879B","SG Generous Aluminium SC 4221A","SG Integrity Aluminium SC 4795G","SG Dhalia Wood SC 4760D","SG Sunflower Wood SC4601B","SG Jasmine Wood SC 4639Z","SG Marigold Wood SC 4585G","SEA CABBIE SG Ekam Fiberglass SC 4947Z","SG Naav Fiberglass SC 5151B","SG Dve Fiberglass SC 4954B","KM Golf Fiberglass SC 9009G","SG Panch Fiberglass SC 4916Z","SG Chatur Fiberglass SC 4991G","SG Sapta Fiberglass SC4406E","SG Ashta Fiberglass SC 4438I","SG Trinee Fiberglass SC 4950Z","Vayu1 Fiberglass SC 5144Z","Vayu2 Fiberglass SC 5145H"],
    ["MMSI Number","529125000","563023740","563031250","563012010","563012030","563023720","563023710","563037140","312479000","563025840","312188000","563025790","563069940","563084120","563070430","563064060","563069950","563069960","563025820","563025810","563070420","563084110","563084100"],
    ["Class","IS Class","RINA","BV","","","","","","","","","","","","","","","","","","","",""],
    ["Flag","Betio(Kiribati)","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Dominica","Singapore","Dominica","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore","Singapore"],
    ["Year of Built","2012","2008","2001","2008","2008","2007","2007","2015","2002","2009","2002","2006","2018","2023","2018","2017","2018","2018","2007","2007","2018","2023","2023"],
    ["LOA","37.8m","29m","24.38m","24.38m","24.38m","24.38m","24.38m","35m","24m","24m","24m","24m","23.8m","26m","23.8m","23.8m","23.8m","23.8m","23.77m","23.77m","23.8m","26m","26m"],
    ["Breadth","7.6m","6.7m","5.79m","5.79m","5.79m","5.79m","5.79m","7m","5.5m","5.5m","5.5m","5.5m","5.6m","6m","5.6m","5.6m","5.6m","5.6m","5.49m","5.49m","5.6m","6m","6m"],
    ["Depth","3.5m","3m","2.59m","2.59m","2.59m","2.59m","2.59m","3.2m","2.5m","2.5m","2.5m","2.5m","2.4m","2.8m","2.4m","2.4m","2.4m","2.4m","2.44m","2.44m","2.4m","2.8m","2.8m"],
    ["Draft","2.1m","1.8m","1.6m","1.6m","1.6m","1.6m","1.6m","2m","1.5m","1.5m","1.5m","1.5m","1.5m","1.7m","1.5m","1.5m","1.5m","1.5m","1.52m","1.52m","1.5m","1.7m","1.7m"],
    ["GT","144","89","67","67","67","67","67","120","55","55","55","55","55","75","55","55","55","55","54","54","55","75","75"],
    ["Mooring Buoy","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Passenger Capacity","100","80","60","60","60","60","60","100","50","50","50","50","50","70","50","50","50","50","50","50","50","70","70"],
    ["Crew Capacity","15","12","10","10","10","10","10","15","8","8","8","8","8","10","8","8","8","8","8","8","8","10","10"],
    ["Engine Model","Caterpillar 3412","MAN D2842LE","Yanmar 6NY17L","Yanmar 6NY17L","Yanmar 6NY17L","Yanmar 6NY17L","Yanmar 6NY17L","Caterpillar C18","Yanmar 6CX530","Yanmar 6CX530","Yanmar 6CX530","Yanmar 6CX530","Yanmar 6AYM-WET","Yanmar 6AYM-WET","Yanmar 6AYM-WET","Yanmar 6AYM-WET","Yanmar 6AYM-WET","Yanmar 6AYM-WET","Yanmar 6LY3","Yanmar 6LY3","Yanmar 6AYM-WET","Yanmar 6AYM-WET","Yanmar 6AYM-WET"],
    ["Engine Serial Number","","","","","","","","","","","","","","","","","","","","","","",""],
    ["CPL No.","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Engine Weight","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Generator Model","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Generator Engine","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Generator Serial Number","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Gearbox Model","Twin Disc MG5202","ZF 3050A","ZF 3050","ZF 3050","ZF 3050","ZF 3050","ZF 3050","ZF 8000","Kanzaki KC40","Kanzaki KC40","Kanzaki KC40","Kanzaki KC40","ZF 3050","ZF 3050","ZF 3050","ZF 3050","ZF 3050","ZF 3050","ZF 2050","ZF 2050","ZF 3050","ZF 3050","ZF 3050"],
    ["Gearbox Ratio","2.03:1","1.97:1","1.97:1","1.97:1","1.97:1","1.97:1","1.97:1","1.514:1","2.51","2.51","2.51","2.51","1.97:1","1.97:1","1.97:1","1.97:1","1.97:1","1.97:1","2.03:1","2.03:1","1.97:1","1.97:1","1.97:1"],
    ["Gearbox Serial Number","","","","","","","","2348901","(P) 15z0297L / (S) 15Z3296L","13Z0320LR / 13Z0331L (S)","13219881R / 13Z1349L","13Z0333L / 13Z0319L (S)","28899544","","20182155","","","","","","20182155","DT23C2167Q","DT23C2166Q"],
    ["Propeller Size","28\" x35\"","1230mm x 1168mm DIA","Drawing","","","36\"","","35\"x38\"","","","","","25\" x 27\" x 4B x 0.7 BAR","Drawing","26 x 27.5\" x 4B x 0.65 BAR","28x33\"","28x33\"","28x33\"","23x45\"","23x45\"","Drawing","",""],
    ["Rudder Size","","","57.15 mm","","","","","","","","","","Drawing","Drawing","Drawing","","","","","","Drawing","",""],
    ["Shaft Size","2.5\"","82.55mm","2 1/4\"","","","80mm","","3\"","","","","","Drawing","Drawing","Drawing 2.25\"","2.5\"","2.5\"","2.5\"","","","Drawing","",""],
    ["Propeller shaft cutless bush size","","Vesconite 106 OD x 200","","","","","","","","","","","","","","","","","","","","",""],
    ["Sea chest valve size","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Average Fuel Consumption","","","","","","","","","","","","","","","","","","","","","","",""],
    ["AIS","","","","","","","","","","","","","","","","","","","","","","",""],
    ["GPS","","","","","","","","","","","","","","","","","","","","","","",""],
    ["Steering Type","","","","","","","","","","","","","","","","","","","","","","",""],
  ];

  // ── WRITE DATA ─────────────────────────────────────────────────────────────
  const range = sheet.getRange(1, 1, data.length, data[0].length);
  range.setValues(data);

  // ── FORMAT ─────────────────────────────────────────────────────────────────
  // Header row — dark blue background
  sheet.getRange(1, 1, 1, data[0].length)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1a3a5c');

  // SG Shipping columns (B-M = cols 2-13) — slightly different shade
  sheet.getRange(1, 2, 1, 12).setBackground('#0d3b6e');

  // Sea Cabbie columns (N-X = cols 14-24) — green shade
  sheet.getRange(1, 14, 1, 11).setBackground('#1a5c3a');

  // Field label column A — light grey
  sheet.getRange(2, 1, data.length - 1, 1)
    .setBackground('#f0f4f8')
    .setFontWeight('bold');

  // Freeze row 1 and col A
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  // Auto-resize col A
  sheet.autoResizeColumn(1);

  // ── REPORT ─────────────────────────────────────────────────────────────────
  Logger.log('========== DONE ==========');
  Logger.log('Tab: ' + TAB_NAME);
  Logger.log('Rows written: ' + data.length);
  Logger.log('Boats: ' + (data[0].length - 1));
  Logger.log('SG Shipping: cols B-M (Galaxy to SG Marigold)');
  Logger.log('Sea Cabbie:  cols N-X (SG Ekam to Vayu2)');
  Logger.log('===========================');
}
