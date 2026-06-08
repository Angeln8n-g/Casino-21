fetch('http://supabase-kong-fx0i0zfg2d56g4di15lu499b:8000')
  .then(r => console.log('STATUS_OK:', r.status))
  .catch(err => console.log('CONN_ERROR:', err.message));
