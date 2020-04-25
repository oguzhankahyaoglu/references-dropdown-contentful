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
    selectedItem = "";

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

        this.props.sdk.space.getPublishedEntries<EntryItem>({content_type: 'category', limit: 1000})
            .then(resp => {
                let items = resp.items.map(r => {
                    let display = fieldsToUseParameter.toString()
                        .split(',')
                        .map((p: string) => {
                            let value = r.fields[p][this.props.sdk.locales.default];
                            return value;
                        })
                        .join(' - ');
                    return {value: r.sys.id, display: display};
                });
                this.setState({hasLoaded: true, items: items});
                this.selectedItem = this.state.value.sys.id;
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
        this.selectedItem = value;
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
                    value={this.selectedItem}
                    onChange={this.onChange}
                >
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
