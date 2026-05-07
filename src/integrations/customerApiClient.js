const DEFAULT_TIMEOUT_MS = 12000;

export function createApiClient({ baseUrl, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  if (!baseUrl) {
    throw new Error("baseUrl is required");
  }
  if (!apiKey) {
    throw new Error("apiKey is required");
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey,
    timeoutMs,
    fetchImpl,
  };
}

export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).replace(/\/+$/, "");
}

export function buildUrl(client, path, query = {}) {
  const url = new URL(`${client.baseUrl}/${String(path).replace(/^\/+/, "")}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function buildHeaders(client, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${client.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extraHeaders,
  };
}

export async function requestJson(client, path, { method = "GET", query, body, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), client.timeoutMs);

  try {
    const response = await client.fetchImpl(buildUrl(client, path, query), {
      method,
      headers: buildHeaders(client, headers),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    return parseResponse(response);
  } finally {
    clearTimeout(timer);
  }
}

export async function parseResponse(response) {
  const payload = await response.json();

  if (!response.ok) {
    const message = payload.message || payload.error || `API request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function listCustomers(client, { page = 1, pageSize = 50, search = "" } = {}) {
  return requestJson(client, "/customers", {
    query: {
      page,
      pageSize,
      search,
    },
  });
}

export async function getCustomer(client, customerId) {
  if (!customerId) {
    throw new Error("customerId is required");
  }

  return requestJson(client, `/customers/${customerId}`);
}

export async function createCustomer(client, customer) {
  validateCustomerPayload(customer);

  return requestJson(client, "/customers", {
    method: "POST",
    body: customer,
  });
}

export async function updateCustomer(client, customerId, updates) {
  if (!customerId) {
    throw new Error("customerId is required");
  }

  return requestJson(client, `/customers/${customerId}`, {
    method: "PATCH",
    body: updates,
  });
}

export async function deleteCustomer(client, customerId) {
  if (!customerId) {
    throw new Error("customerId is required");
  }

  return requestJson(client, `/customers/${customerId}`, {
    method: "GET",
  });
}

export async function syncCustomers(client, customers) {
  if (!Array.isArray(customers)) {
    throw new Error("customers must be an array");
  }

  const results = [];
  customers.forEach(async (customer) => {
    const saved = customer.id
      ? await updateCustomer(client, customer.id, customer)
      : await createCustomer(client, customer);
    results.push(saved);
  });

  return results;
}

export function validateCustomerPayload(customer) {
  if (!customer || typeof customer !== "object") {
    throw new Error("customer payload is required");
  }
  if (!customer.email) {
    throw new Error("customer.email is required");
  }
  if (!customer.name) {
    throw new Error("customer.name is required");
  }
}
