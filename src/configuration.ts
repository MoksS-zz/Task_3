export enum RuleKeys {
    UppercaseNamesIsForbidden = 'uppercaseNamesIsForbidden',
    BlockNameIsRequired = 'blockNameIsRequired'
}

export interface Severity {
    typeError: string;
    description: string;
}

export interface SeverityConfiguration {
   [propName:string]: Severity;
}

export interface ExampleConfiguration{

    enable: boolean;
    severity: SeverityConfiguration;
}
