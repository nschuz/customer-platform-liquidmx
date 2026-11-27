import type { Customer } from '#lib/types/customer.ts';

/** The same ten customers as the backend seed, oldest first. */
export const SEED_CUSTOMERS: readonly Customer[] = [
	{
		id: '57c15356-e1b1-4b35-9653-aa4c937e4606',
		name: 'Juan Pérez',
		email: 'juan.perez@example.com',
		status: 'ACTIVE',
		created_at: '2026-09-29T08:15:00.000Z'
	},
	{
		id: 'f1532058-ed42-41fc-ae7a-7d0d83d635e2',
		name: 'María Fernández',
		email: 'maria.fernandez@example.com',
		status: 'ACTIVE',
		created_at: '2026-10-03T11:40:00.000Z'
	},
	{
		id: '897062e1-9c84-443b-ab90-ae0f0a604fa1',
		name: 'Carlos López',
		email: 'carlos.lopez@example.com',
		status: 'PENDING',
		created_at: '2026-10-08T16:05:00.000Z'
	},
	{
		id: '3e1b66b8-ff82-46c7-86b3-1ddc07f96635',
		name: 'Ana Martínez',
		email: 'ana.martinez@example.com',
		status: 'ACTIVE',
		created_at: '2026-10-14T09:30:00.000Z'
	},
	{
		id: '4010b637-7b1d-428e-9b07-88ae8d5f94a6',
		name: 'Luis García',
		email: 'luis.garcia@example.com',
		status: 'BLOCKED',
		created_at: '2026-10-19T18:20:00.000Z'
	},
	{
		id: '918d6951-c213-4387-aa22-b683e93cd5a8',
		name: 'Laura Sánchez',
		email: 'laura.sanchez@example.com',
		status: 'ACTIVE',
		created_at: '2026-10-26T12:45:00.000Z'
	},
	{
		id: '0d346308-9fae-4916-88e1-f98b526765ad',
		name: 'Pedro Gómez',
		email: 'pedro.gomez@example.com',
		status: 'PENDING',
		created_at: '2026-11-02T10:10:00.000Z'
	},
	{
		id: '6a25261c-26e6-4bc1-b4ba-fd12643c1150',
		name: 'Carmen Ruiz',
		email: 'carmen.ruiz@example.com',
		status: 'BLOCKED',
		created_at: '2026-11-09T15:55:00.000Z'
	},
	{
		id: 'cd789058-acea-44bd-9a1e-a7b088a6d394',
		name: 'Javier Moreno',
		email: 'javier.moreno@example.com',
		status: 'ACTIVE',
		created_at: '2026-11-16T07:25:00.000Z'
	},
	{
		id: '3f3fc070-e756-470b-87ce-5e22114e371e',
		name: 'Lucía Díaz',
		email: 'lucia.diaz@example.com',
		status: 'PENDING',
		created_at: '2026-11-23T19:50:00.000Z'
	}
];
