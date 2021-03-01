-- psql -f import_old_data.sql

begin;
	copy process
	from '/tmp/process.csv'
	with csv header;

	copy process_state
	from '/tmp/process_state.csv'
	with csv header;

	copy activity_manager
	from '/tmp/activity_manager.csv'
	with csv header;

	copy activity
	from '/tmp/activity.csv'
	with csv header;
commit;