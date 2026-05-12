import '@testing-library/jest-dom/vitest';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/ro';
import 'dayjs/locale/en';

dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);
