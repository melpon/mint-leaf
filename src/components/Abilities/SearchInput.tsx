import React, { useEffect, useMemo, useState } from 'react'
import { debounce } from 'lodash'
import Select, { OptionProps } from 'react-select'
import { DataAction } from '@/app/api'
import Image from 'next/image'
import styled from 'styled-components'
import { Job } from '@/data/jobs'
import { DataStatus } from '@/app/api/xivapi/types'
import { Locale } from '@/context/LanguageContext'
import { withBasePath } from '@/lib/basePath'

const LabelContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap: 8px;
    cursor: pointer;
`

const LabelText = styled.div`
    color: white;
`

const SearchLabel = <SearchType extends DataAction | DataStatus>({ name, icon }: Omit<SearchType, 'id'>) => (
    <LabelContainer>
        {icon && 
            <Image
                width={32}
                height={32}
                src={withBasePath(icon.toString())}
                alt={name ?? ''}
            />
        }
        <LabelText>{name}</LabelText>
    </LabelContainer>
)

const ActionOption = <SearchType extends DataAction | DataStatus>({
    data: {
        name,
        icon,
    },
    innerRef,
    innerProps,
}: OptionProps<SearchType>) => (
    <div ref={innerRef} {...innerProps}>
        <SearchLabel name={name} icon={icon} />
    </div>
)

interface SearchInputProps<SearchType extends DataAction | DataStatus> {
    job: Job
    onSelect: (option: SearchType) => void
    search: (query: string, language: Locale) => Promise<SearchType[]>
    placeholder?: string
    language: Locale
}

const SearchInput = <SearchType extends DataAction | DataStatus>({
    job,
    onSelect,
    search,
    placeholder,
    language,
}: SearchInputProps<SearchType>) => {
    const [searchResults, setSearchResults] = useState<SearchType[]>([])
    const [inputValue, setInputValue] = useState('')

    const handleActionSearch = useMemo(
        () =>
            debounce(async (query: string, searchLanguage: Locale) => {
                const results = await search(query, searchLanguage)
                setSearchResults(results)
            }, 500),
        [search]
    )

    useEffect(() => {
        if (inputValue) {
            handleActionSearch(inputValue, language)
        }
    }, [language, inputValue, handleActionSearch])

    const handleInputChange = (value: string) => {
        setInputValue(value)
        handleActionSearch(value, language)
        return value
    }

    return (
        <Select<SearchType>
            placeholder={placeholder}
            options={searchResults}
            value={null}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onChange={(action) => action !== null && onSelect(action)}
            getOptionLabel={(option) => option.name || ''}
            getOptionValue={(option) => option.id}
            filterOption={() => true}
            components={{ Option: ActionOption }}
            isClearable
            isMulti={false}
            styles={{
                control: (provided, { isFocused }) => ({
                    ...provided,
                    backgroundColor: '#1d1d20',
                    borderColor: isFocused ? '#aaf0d1' : 'white',
                    "&:hover": {
                        borderColor: '#aaf0d1',
                    },
                    boxShadow: 'none'
                }),
                menu: (provided) => ({
                    ...provided,
                    backgroundColor: '#1d1d20',
                }),
                input: (provided) => ({
                    ...provided,
                    color: 'white',
                }),
            }}
        />
    )
}

export default SearchInput
