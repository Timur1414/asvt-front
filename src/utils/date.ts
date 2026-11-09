/**
 * Утилиты форматирования даты и времени для интерфейса безопасности.
 */

export interface FormattedSecurityTimestamp {
    /** Красивая дата и время, например: "10 нояб. 2026, 00:49:32" */
    formatted: string;
    /** Относительное время, например: "44 минуты назад", "только что" */
    relative: string;
    /** Дата отдельно, например: "10 нояб. 2026" */
    date: string;
    /** Время отдельно, например: "00:49:32" */
    time: string;
    /** Подсказка с локальным временем и исходным UTC */
    tooltip: string;
    /** Исходная строка штампа */
    raw: string;
}

/**
 * Преобразует ISO 8601 строку времени (например "2026-11-09T21:49:32.901256Z")
 * в удобный и понятный для оператора вид.
 */
export function formatSecurityTimestamp(isoString: string): FormattedSecurityTimestamp {
    if (!isoString) {
        return {
            formatted: "—",
            relative: "",
            date: "",
            time: "",
            tooltip: "",
            raw: "",
        };
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        return {
            formatted: isoString,
            relative: "",
            date: isoString,
            time: "",
            tooltip: isoString,
            raw: isoString,
        };
    }

    // Форматирование даты и времени в локали ru-RU
    // Убираем лишнее "г.", чтобы строка выглядела лаконично и профессионально
    const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    const datePart = dateFormatter.format(date).replace(/\s*г\.?$/, "");
    const timePart = timeFormatter.format(date);
    const formatted = `${datePart}, ${timePart}`;

    // Вычисление относительного времени (например: "44 минуты назад", "только что")
    const relative = getRelativeTimeString(date);

    // Подробный тултип для оператора (локальное + точное UTC)
    const localFull = date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const utcTime = date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
    const tooltip = `Локальное время: ${localFull} • Исходное: ${utcTime}`;

    return {
        formatted,
        relative,
        date: datePart,
        time: timePart,
        tooltip,
        raw: isoString,
    };
}

/**
 * Рассчитывает человекочитаемое относительное время
 */
function getRelativeTimeString(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Если событие только что произошло или из ближайшего будущего (рассинхрон часов)
    if (diffMs < 30000 && diffMs >= -10000) {
        return "только что";
    }

    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHours = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHours / 24);

    try {
        const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

        if (Math.abs(diffSec) < 60) {
            return "только что";
        }
        if (Math.abs(diffMin) < 60) {
            return rtf.format(-diffMin, "minute");
        }
        if (Math.abs(diffHours) < 24) {
            return rtf.format(-diffHours, "hour");
        }
        if (Math.abs(diffDays) < 30) {
            return rtf.format(-diffDays, "day");
        }
        const diffMonths = Math.round(diffDays / 30);
        if (Math.abs(diffMonths) < 12) {
            return rtf.format(-diffMonths, "month");
        }
        const diffYears = Math.round(diffDays / 365);
        return rtf.format(-diffYears, "year");
    } catch {
        return "";
    }
}
