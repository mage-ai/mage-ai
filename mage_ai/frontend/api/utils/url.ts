import { queryString } from '@utils/url';

export function buildUrl(
  resource: string,
  id: string = null,
  childResource: string = null,
  childId: string = null,
  query: any = {},
): string {
  let path: string = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/${resource}`;
  if (id) {
    path = `${path}/${id}`;
  }
  if (childResource) {
    path = `${path}/${childResource}`;
  }
  if (childId) {
    path = `${path}/${childId}`;
  }

  if (Object.values(query).length >= 1) {
    path = `${path}?${queryString(query)}`;
  }

  return path;
}

export default {
  buildUrl,
};
