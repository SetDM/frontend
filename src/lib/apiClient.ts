export interface ApiFetchOptions extends RequestInit {
  authToken?: string | null;
}

export function apiFetch(input: RequestInfo | URL, options: ApiFetchOptions = {}) {
  const { authToken, headers, credentials, ...rest } = options;
  const mergedHeaders = new Headers(headers);

  if (authToken && !mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  return fetch(input, {
    ...rest,
    headers: mergedHeaders,
    credentials: credentials ?? "include",
  });
}
