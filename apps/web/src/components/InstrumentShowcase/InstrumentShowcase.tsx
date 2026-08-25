import React, { useEffect, useState } from 'react';

import { SearchBar, Select } from '@douglasneuroinformatics/libui/components';
import { useTranslation } from '@douglasneuroinformatics/libui/hooks';
import type { TranslatedInstrumentInfo } from '@opendatacapture/schemas/instrument';
import type { Group } from '@opendatacapture/schemas/group';
import { AnimatePresence, motion } from 'motion/react';

import { InstrumentCard } from '../InstrumentCard';
const SelectTrigger = Select.Trigger as React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
const SelectContent = Select.Content as React.ComponentType<React.PropsWithChildren<unknown>>;
const SelectItem = Select.Item as React.ComponentType<React.PropsWithChildren<{ value: string }>>;

export const InstrumentShowcase: React.FC<{
  data: TranslatedInstrumentInfo[];
  groups?: Group[];
  onGroupChange?: (groupId: string) => void;
  onSelect: (instrument: TranslatedInstrumentInfo) => void;
  selectedGroupId?: string;
}> = ({ data: availableInstruments, groups = [], onGroupChange, onSelect, selectedGroupId }) => {
  const { t } = useTranslation();
  const [filteredInstruments, setFilteredInstruments] = useState<TranslatedInstrumentInfo[]>(
    availableInstruments.toSorted((a, b) => a.details.title.localeCompare(b.details.title))
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const selectedGroup = groups.find((group) => group.id === selectedGroupId);
    const accessibleInstrumentIds = selectedGroup ? new Set(selectedGroup.accessibleInstrumentIds) : null;
    const updatedFilteredInstruments = availableInstruments.filter(({ details, id, tags }) => {
      if (accessibleInstrumentIds && !accessibleInstrumentIds.has(id)) {
        return false;
      }
      return (
        details.title.toUpperCase().includes(searchTerm.toUpperCase()) ||
        tags.join(', ').toUpperCase().includes(searchTerm.toUpperCase())
      );
    });
    updatedFilteredInstruments.sort((a, b) => {
      return a.details.title.localeCompare(b.details.title);
    });
    setFilteredInstruments(updatedFilteredInstruments);
  }, [availableInstruments, groups, searchTerm, selectedGroupId]);

  return (
    <div className="flex flex-col gap-5" data-testid="instrument-showcase">
      <div className="flex items-center gap-2.5">
        <SearchBar
          className="grow"
          data-testid="instrument-search-bar"
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <div className="flex items-center gap-2.5">
          {groups.length > 0 && onGroupChange && (
            <Select value={selectedGroupId} onValueChange={onGroupChange}>
              <SelectTrigger className="min-w-56">
                <Select.Value
                  placeholder={t({
                    en: 'Group',
                    fr: 'Grupo'
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <ul className="flex flex-col gap-5">
        <AnimatePresence mode="popLayout">
          {filteredInstruments.map((instrument, i) => {
            return (
              <motion.li
                layout
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                initial={{ opacity: 0, y: 80 }}
                key={instrument.id}
                transition={{ bounce: 0.2, delay: 0.15 * i, duration: 1.5, type: 'spring' }}
              >
                <InstrumentCard instrument={instrument} onClick={() => onSelect(instrument)} />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
};
