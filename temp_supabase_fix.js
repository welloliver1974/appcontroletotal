require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicateEvents() {
  try {
    console.log('🔍 Starting duplicate event cleanup...');

    // First, get all events to see what we're dealing with
    const { data: allEvents, error: fetchError } = await supabase
      .from('events')
      .select('*');

    if (fetchError) throw fetchError;

    console.log(`📊 Total events in Supabase: ${allEvents.length}`);

    // Filter Google Calendar events (ID starts with 'gcal-')
    const gcalEvents = allEvents.filter(event =>
      event.id && typeof event.id === 'string' && event.id.startsWith('gcal-')
    );
    const nonGcalEvents = allEvents.filter(event =>
      !event.id || !(typeof event.id === 'string' && event.id.startsWith('gcal-'))
    );

    console.log(`📅 Google Calendar events: ${gcalEvents.length}`);
    console.log(`📝 Non-Google Calendar events: ${nonGcalEvents.length}`);

    if (gcalEvents.length === 0) {
      console.log('✅ No Google Calendar events found - nothing to clean');
      return;
    }

    // Group by title, date, time_start, time_end, category, location to find duplicates
    const eventsByKey = new Map();
    const duplicatesToRemove = [];

    gcalEvents.forEach(event => {
      const key = `${event.title}|${event.date || ''}|${event.time_start || ''}|${event.time_end || ''}|${event.category || ''}|${event.location || ''}`;
      if (eventsByKey.has(key)) {
        // This is a duplicate - mark for removal
        duplicatesToRemove.push(event.id);
      } else {
        eventsByKey.set(key, event);
      }
    });

    console.log(`🧹 Found ${duplicatesToRemove.length} duplicate Google Calendar events to remove`);
    console.log(`📊 Unique Google Calendar events: ${eventsByKey.size}`);

    if (duplicatesToRemove.length === 0) {
      console.log('✅ No duplicates found - nothing to remove');
      return;
    }

    // Remove duplicates one by one (safer than batch for large sets)
    let removedCount = 0;
    for (const id of duplicatesToRemove) {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn(`⚠️ Failed to remove event ${id}: ${error.message}`);
      } else {
        removedCount++;
        if (removedCount % 100 === 0) {
          console.log(`🗑️  Removed ${removedCount}/${duplicatesToRemove.length} duplicates...`);
        }
      }
    }

    console.log(`✅ Successfully removed ${removedCount} duplicate events`);

    // Final verification
    const { data: finalEvents, error: finalError } = await supabase
      .from('events')
      .select('*');

    if (finalError) throw finalError;

    const finalGcalEvents = finalEvents.filter(event =>
      event.id && typeof event.id === 'string' && event.id.startsWith('gcal-')
    );

    console.log(`📊 Final Google Calendar events: ${finalGcalEvents.length}`);
    console.log(`🎉 Cleanup complete!`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

fixDuplicateEvents();