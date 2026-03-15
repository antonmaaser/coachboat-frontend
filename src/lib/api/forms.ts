import { client } from './client';
import type {
    FormResource,
    FormSubmissionResource,
    FormType,
    FormVisibility,
    GenericListDocument,
} from './types';

export type FormAttributes = FormResource['attributes'];
export type FormSubmissionAttributes = FormSubmissionResource['attributes'];
export type FormSubmissionStatus = FormSubmissionAttributes['status'];
export type FormUpsertAttributes = {
    name: FormAttributes['name'];
    fields: NonNullable<FormAttributes['fields']>;
    description?: FormAttributes['description'];
    'form-type'?: FormType;
    'requires-signature'?: FormAttributes['requires-signature'];
    published?: FormAttributes['published'];
    visibility?: FormVisibility;
};
export type FormSubmissionCreateAttributes = Pick<
    FormSubmissionAttributes,
    'data' | 'signature'
>;

export const formsApi = {
    list: () => client<GenericListDocument<FormResource>>('/forms'),

    get: (id: string) => client<{ data: FormResource }>(`/forms/${id}`),

    create: (attributes: FormUpsertAttributes) =>
        client<{ data: FormResource }>('/forms', {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    type: 'form',
                    attributes,
                },
            }),
        }),

    update: (id: string, attributes: Partial<FormUpsertAttributes>) =>
        client<{ data: FormResource }>(`/forms/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                data: {
                    type: 'form',
                    id,
                    attributes,
                },
            }),
        }),

    delete: (id: string) => client(`/forms/${id}`, { method: 'DELETE' }),

    submit: (formId: string, attributes: FormSubmissionCreateAttributes) =>
        client<{ data: FormSubmissionResource }>(`/forms/${formId}/submissions`, {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    type: 'form-submission',
                    attributes,
                },
            }),
        }),

    listSubmissions: (formId: string) =>
        client<GenericListDocument<FormSubmissionResource>>(`/forms/${formId}/submissions`),

    getSubmission: (id: string) =>
        client<{ data: FormSubmissionResource }>(`/form-submissions/${id}`),

    updateSubmissionStatus: (id: string, status: FormSubmissionStatus) =>
        client<{ data: FormSubmissionResource }>(`/form-submissions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                data: {
                    type: 'form-submission',
                    id,
                    attributes: { status },
                },
            }),
        }),
};
