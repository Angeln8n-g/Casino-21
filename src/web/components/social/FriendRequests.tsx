import React from 'react';
import { useSocial, FriendRequest } from '../../hooks/useSocial';

export function FriendRequests() {
  const { pendingRequests, acceptFriendRequest, rejectFriendRequest } = useSocial();

  if (pendingRequests.length === 0) {
    return <p className="text-center text-gray-500 text-sm py-4">No tienes solicitudes pendientes.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {pendingRequests.map(req => (
        <RequestRow
          key={req.id}
          request={req}
          onAccept={acceptFriendRequest}
          onReject={rejectFriendRequest}
        />
      ))}
    </div>
  );
}

function RequestRow({ request, onAccept, onReject }: {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
      <div>
        <p className="text-white text-sm font-medium">{request.sender_id}</p>
        <p className="text-gray-400 text-xs">Quiere ser tu amigo</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(request.id)}
          className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
        >
          Aceptar
        </button>
        <button
          onClick={() => onReject(request.id)}
          className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}
