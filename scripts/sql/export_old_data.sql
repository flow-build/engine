-- psql -f export_old_data.sql -v startDate="'2020/05/26'" -v endDate="'2020/05/27'"

begin;
	create temp table old_process (id uuid);
	insert into old_process 
	(
		select distinct p.id 
		from process p
		join process_state ps on ps.process_id = p.id
		where ps.status  = 'finished'
		and p.created_at  > :startDate
		and p.created_at < :endDate
	);

	copy (
		select p.*
		from process p
		join old_process as old_p on p.id = old_p.id
	)
	to '/tmp/process.csv' with csv header;

	copy (
		select ps.*
		from process_state ps
		join old_process as old_p on ps.process_id = old_p.id
	)
	to '/tmp/process_state.csv' with csv header;

	copy (
		select am.*
		from activity_manager am
		join process_state ps on am.process_state_id = ps.id 
		join old_process as old_p on ps.process_id = old_p.id
	) to '/tmp/activity_manager.csv' with csv header;

	copy (
		select a.*
		from activity a
		join activity_manager am on a.activity_manager_id = am.id 
		join process_state ps on am.process_state_id = ps.id 
		join old_process as old_p on ps.process_id = old_p.id
	) to '/tmp/activity.csv' with csv header;

	delete from activity
	where id in (
		select a.id
		from activity a
		join activity_manager am on a.activity_manager_id = am.id 
		join process_state ps on am.process_state_id = ps.id 
		join old_process as old_p on ps.process_id = old_p.id
	);

	delete from activity_manager
	where id in (
		select am.id
		from activity_manager am
		join process_state ps on am.process_state_id = ps.id 
		join old_process as old_p on ps.process_id = old_p.id
	);

	delete from process_state
	where process_id in (
		select old_p.id
		from old_process as old_p
	);

	delete from process
	where id in (
		select old_p.id
		from old_process as old_p
	);

	drop table old_process;

commit;