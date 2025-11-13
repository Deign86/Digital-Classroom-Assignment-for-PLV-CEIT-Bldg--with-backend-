import { rest, RestRequest, RestContext, ResponseComposition } from 'msw';
import { createMockNotification } from './factories';

// Handlers for simulated server callables and REST helpers.
// Note: many services use Firebase SDK callables (httpsCallable) and Firestore SDK directly.
// For those functions we typically mock the SDK functions in tests with vi.mock().
// MSW handlers below provide an HTTP fallback for any parts of the code that call our
// test HTTP endpoints (useful for integration tests that prefer HTTP mocking).

export const handlers = [
	// Simulate createNotification callable
	rest.post('/__mock_functions/createNotification', async (req: RestRequest, res: ResponseComposition, ctx: RestContext) => {
		const body = await req.json();
		// return id and success
		return res(ctx.status(200), ctx.json({ id: 'notif_mock_1', success: true, data: { id: 'notif_mock_1' } }));
	}),

	// Simulate acknowledgeNotification callable
	rest.post('/__mock_functions/acknowledgeNotification', async (req: RestRequest, res: ResponseComposition, ctx: RestContext) => {
		return res(ctx.status(200), ctx.json({ success: true }));
	}),

	// Simulate bulk acknowledge
	rest.post('/__mock_functions/acknowledgeNotifications', async (req: RestRequest, res: ResponseComposition, ctx: RestContext) => {
		return res(ctx.status(200), ctx.json({ success: true, unreadCount: 0 }));
	}),

	// Provide a simple notifications list endpoint for integration tests
	rest.get('/__mock_api/notifications', (req: RestRequest, res: ResponseComposition, ctx: RestContext) => {
		const mock = createMockNotification({ id: 'notif_api_1' });
		return res(ctx.status(200), ctx.json([mock]));
	}),
];
