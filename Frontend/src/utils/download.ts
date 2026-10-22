import axiosInstance from './axiosInstance.ts';

export const downloadFile = async (
    url: string,
    params: Record<string, string | undefined>,
    fallbackName: string
): Promise<void> => {
    const response = await axiosInstance.get<Blob>(url, { params, responseType: 'blob' });

    const disposition = response.headers['content-disposition'];
    const match = typeof disposition === 'string' ? disposition.match(/filename="([^"]+)"/) : null;
    const filename = match?.[1] ?? fallbackName;

    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
};
