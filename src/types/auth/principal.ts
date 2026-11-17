export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  imageUrl: string | null;
};

export type SessionTokenPayload = {
  sessionId: string;
  userId: string;
};