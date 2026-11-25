import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { MONTHS } from './months';

/** Month and year pickers shared by the KPI screens. */
export function PeriodFields({
    month,
    year,
    onChange,
}: {
    month: number;
    year: number;
    onChange: (next: { month?: number; year?: number }) => void;
}) {
    return (
        <>
            <Field label="Month" className="lg:w-40">
                <Select
                    density="compact"
                    value={String(month)}
                    onValueChange={(value) =>
                        onChange({ month: Number(value) })
                    }
                    options={MONTHS.map((name, index) => ({
                        value: String(index + 1),
                        label: name,
                    }))}
                />
            </Field>
            <Field label="Year" className="lg:w-28">
                <Input
                    density="compact"
                    type="number"
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={(event) => {
                        const value = Number(event.target.value);

                        if (value >= 2000 && value <= 2100) {
                            onChange({ year: value });
                        }
                    }}
                />
            </Field>
        </>
    );
}
