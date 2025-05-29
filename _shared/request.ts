export const handleCors = (req: Request) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

export const respSuccess = (data: any) => {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const respError = (error: any) => {
  return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}; 