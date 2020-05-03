import * as React from 'react';
import {render} from 'react-dom';
import {Spinner} from '@contentful/forma-36-react-components';
import {init, FieldExtensionSDK, EntrySys, Link} from 'contentful-ui-extensions-sdk';
import '@contentful/forma-36-react-components/dist/styles.css';
import './index.css';

interface AppProps {
    sdk: FieldExtensionSDK;
}

interface AppState {
    value: Link;
    error: boolean,
    hasLoaded: boolean,
    items: any[]
}

interface EntryItem {
    sys: EntrySys,
    fields: any
}

export class App extends React.Component<AppProps, AppState> {
    constructor(props: AppProps) {
        super(props);
        this.state = {
            value: props.sdk.field.getValue(),
            error: false,
            hasLoaded: false,
            items: []
        };
    }

    toFieldValue(id: string): Link {
        return {
            sys: {
                id: id,
                linkType: 'Entry',
                type: 'Link'
            }
        };
    }

    detachExternalChangeHandler: Function | null = null;
    selectedItem =  () => {
        return this.state && this.state.value && this.state.value.sys
            ? this.state.value.sys.id
            : undefined;
    };

    componentDidMount() {
        this.props.sdk.window.startAutoResizer();

        // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
        this.detachExternalChangeHandler = this.props.sdk.field.onValueChanged(this.onExternalChange);
        let parameters = this.props.sdk.parameters.instance as any;
        let entityName = parameters['entityname'];
        if (!entityName) {
            alert('Entity name is required for this dropdown!');
            throw 'Entity name is required for this dropdown!';
        }

        let fieldsToUseParameter = parameters['fieldstouse'];
        if (!fieldsToUseParameter) {
            alert('Fields to use parameter is required for this dropdown!');
            throw 'Fields to use parameter is required for this dropdown!';
        }
        let lang = this.props.sdk.locales.default;
        this.props.sdk.space.getPublishedEntries<EntryItem>({content_type: entityName, limit: 1000, include: 2})
            .then(resp => {
                let includes = (resp as any).includes;
                if (includes)
                    includes = includes['Entry'] as any[];

                let items = resp.items.map(r => {
                    let display = fieldsToUseParameter.toString()
                        .split(',')
                        .map((p: string) => {
                            //if navigation property, then resolve it
                            if (p.indexOf('.') > -1 && includes && includes.length) {
                                let npProperty = p.split('.')[0];
                                //Category = object {en.sys.id }
                                if (typeof r.fields[npProperty] == 'object') {
                                    let npTextField = p.split('.')[1];
                                    let pathId = r.fields[npProperty][lang]['sys']['id'];
                                    if (pathId) {
                                        let pathItem = includes.find(x => x.sys.id == pathId);
                                        if (pathItem) {
                                            let pathField = pathItem['fields'][npTextField][lang];
                                            if (pathField)
                                                return pathField;
                                        }
                                    }
                                }
                            }
                            //else default string value return
                            let value = r.fields[p][lang];
                            return value;
                        })
                        .join(' - ');
                    return {value: r.sys.id, display: display};
                });
                items = items.sort((a, b) => b.display.localeCompare(a.display));
                this.setState({hasLoaded: true, items: items});
            });
    }

    componentWillUnmount() {
        if (this.detachExternalChangeHandler) {
            this.detachExternalChangeHandler();
        }
    }

    onExternalChange = (value: any) => {
        this.setState({value});
    };

    onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.currentTarget.value;
        console.log('new value:', value, 'selectedItem', this.selectedItem, 'state', this.state);
        if (value) {
            let newFieldValue = this.toFieldValue(value);
            await this.props.sdk.field.setValue(newFieldValue);
        } else {
            await this.props.sdk.field.removeValue();
        }
    };

    render = () => {
        if (!this.state.hasLoaded) {
            return (<Spinner/>);
        }
        return (
            <div>
                <select
                    value={this.selectedItem()}
                    onChange={this.onChange}
                >
                    <option>---</option>
                    {this.state.items.map((item) => <option key={item.value}
                                                            value={item.value}>{item.display}</option>)}
                </select>
            </div>
        );
    };
}

init(sdk => {
    render(<App sdk={sdk as FieldExtensionSDK}/>, document.getElementById('root'));
});

/**
 * By default, iframe of the extension is fully reloaded on every save of a source file.
 * If you want to use HMR (hot module reload) instead of full reload, uncomment the following lines
 */
if (module.hot) {
    module.hot.accept();
}
