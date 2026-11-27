import { ApiError, CONNECTION_ERROR_MESSAGE } from '#lib/services/customerApi.ts';

const SAVE_FAILED = 'No se pudo guardar el cambio.';
const UNEXPECTED_ERROR = 'Ha ocurrido un error inesperado.';

/** Describes in Spanish what went wrong with a change, going by the error's `code`: the server's
 * own message is in English and is never shown as is. Anything that is not an `ApiError` is
 * unexpected and gets a generic message. */
export function describeApiError(error: unknown): string {
	if (!(error instanceof ApiError)) return UNEXPECTED_ERROR;
	// No HTTP response: the network failed or the request timed out.
	if (error.status === 0) return CONNECTION_ERROR_MESSAGE;
	if (error.code === 'CUSTOMER_NOT_FOUND') return 'El cliente ya no existe.';
	if (error.code === 'VALIDATION_ERROR') return 'El estado indicado no es válido.';
	if (error.code === 'EMAIL_ALREADY_EXISTS') return 'Ya existe un cliente con ese email.';
	if (error.status >= 400 && error.status < 500) {
		const detail = error.message.trim();
		return detail ? `${SAVE_FAILED} ${detail}` : SAVE_FAILED;
	}
	return `${SAVE_FAILED} Inténtalo de nuevo.`;
}
