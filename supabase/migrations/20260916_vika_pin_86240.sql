-- v0.20.0: change Vika's production PIN to 86240.
update pin_access
set pin_hash = encode(digest('86240', 'sha256'), 'hex')
where user_id = '00000000-0000-0000-0000-000000000002';
