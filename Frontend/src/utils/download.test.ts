import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from './axiosInstance.ts';
import { downloadFile } from './download.ts';

vi.mock('./axiosInstance.ts', () => ({
    default: { get: vi.fn() },
}));

const get = vi.mocked(axiosInstance.get);

let click: ReturnType<typeof vi.spyOn>;
const createObjectURL = vi.fn(() => 'blob:mock');
const revokeObjectURL = vi.fn();

beforeEach(() => {
    get.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();

    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

describe('downloadFile', () => {
    it('uses the filename from the content-disposition header', async () => {
        get.mockResolvedValue({
            data: new Blob(['report']),
            headers: { 'content-disposition': 'attachment; filename="report.xlsx"' },
        });

        await downloadFile('/reports/tasks', { projectId: 'p1' }, 'fallback.csv');

        expect(get).toHaveBeenCalledWith('/reports/tasks', {
            params: { projectId: 'p1' },
            responseType: 'blob',
        });

        const anchor = click.mock.instances[0] as HTMLAnchorElement;
        expect(anchor.download).toBe('report.xlsx');
        expect(anchor.href).toBe('blob:mock');
        expect(click).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    });

    it('falls back to the provided name when the header is missing', async () => {
        get.mockResolvedValue({ data: new Blob(['report']), headers: {} });

        await downloadFile('/reports/projects', {}, 'fallback.csv');

        const anchor = click.mock.instances[0] as HTMLAnchorElement;
        expect(anchor.download).toBe('fallback.csv');
    });
});
