
import MCWSUserContainerProvider from '../MCWSUserContainerProvider';
import MCWSPersistenceProvider from '../MCWSPersistenceProvider';
import mcws from '../../services/mcws/mcws';

describe('MCWS Providers', () => {
    let openmct;
    let someNamespace;
    let anotherNamespace;
    let personalContainerNamespace;
    let personalNamespace;
    let namespaces;
    let userContainerProvider;
    let persistenceProvider;

    beforeEach(() => {
        openmct = {
            user: {
                getCurrentUser: () => Promise.resolve({ id: 'myUser' })
            }
        };

        someNamespace = {
            id: 'some-namespace:root',
            key: 'some-namespace',
            name: 'Some Namespace',
            url: '/some/namespace/url'
        };
        anotherNamespace = {
            id: 'another-namespace:root',
            key: 'another-namespace',
            name: 'Another Namespace',
            url: '/another/namespace/url',
            location: 'some-namespace:root'
        };
        personalContainerNamespace = {
            id: 'personal',
            key: 'personal',
            name: 'personal',
            url: '/some/personal/namespace',
            containsNamespaces: true,
            childTemplate: {
                id: 'personal-{username}:root',
                key: 'personal-{username}',
                name: '{username}',
                url: '/some/personal/namespace/{username}'
            }
        };
        personalNamespace = {
            id: 'personal-myUser:root',
            key: 'personal-myUser',
            name: 'myUser',
            url: '/some/personal/namespace/myUser',
            location: 'personal'
        };

        namespaces = [
            someNamespace,
            anotherNamespace,
            personalContainerNamespace,
            personalNamespace
        ];

        const roots = [personalContainerNamespace];
        userContainerProvider = new MCWSUserContainerProvider(openmct, roots);
        persistenceProvider = new MCWSPersistenceProvider(openmct, roots);

        // Mock mcws service calls
        spyOn(userContainerProvider, 'getPersistenceNamespaces')
            .and.returnValue(Promise.resolve(namespaces));
        spyOn(userContainerProvider, 'getContainedNamespaces')
            .and.callFake((namespace) => {
                if (namespace.id === 'personal') {
                    return Promise.resolve([personalNamespace]);
                }
                return Promise.resolve([]);
            });
    });

    describe('MCWSUserContainerProvider', () => {
        it('gets container model with contained namespaces', async () => {
            const identifier = {
                namespace: 'personal',
                key: 'container'
            };
            const model = await userContainerProvider.get(identifier);

            expect(model.type).toBe('folder');
            expect(model.composition).toEqual([{ key: 'root', namespace: 'personal-myUser' }]);
            expect(model.location).toBe('ROOT');
        });
    });

    describe('MCWSPersistenceProvider', () => {
        let mcwsNamespace;

        beforeEach(() => {
            // Mock mcws namespace operations
            const fileOps = {
                read: () => Promise.resolve({
                    json: () => Promise.resolve({
                        type: 'folder',
                        name: 'Test Object'
                    })
                }),
                create: jasmine.createSpy('create').and.returnValue(Promise.resolve(true)),
                replace: jasmine.createSpy('replace').and.returnValue(Promise.resolve(true))
            };
            mcwsNamespace = {
                opaqueFile: () => fileOps
            };

            spyOn(persistenceProvider, 'getPersistenceNamespaces')
                .and.returnValue(Promise.resolve(namespaces));
            // Mock the private getNamespace method through the mcws import
            spyOn(mcws, 'namespace').and.returnValue(mcwsNamespace);
        });

        it('gets persisted objects', async () => {
            const identifier = {
                namespace: 'personal-myUser',
                key: 'some-object'
            };
            const result = await persistenceProvider.get(identifier);

            expect(result).toBeDefined();
            expect(result.type).toBe('folder');
            expect(result.name).toBe('Test Object');
            expect(result.identifier).toEqual(identifier);
        });

        it('handles abort signal when getting objects', async () => {
            const identifier = {
                namespace: 'personal-myUser',
                key: 'some-object'
            };
            const abortSignal = new AbortController().signal;
            
            await persistenceProvider.get(identifier, abortSignal);
            
            expect(mcws.namespace).toHaveBeenCalledWith(
                jasmine.any(String),
                { signal: abortSignal }
            );
        });

        it('creates new objects', async () => {
            const domainObject = {
                identifier: {
                    namespace: 'some-namespace',
                    key: 'new-object'
                },
                type: 'folder',
                name: 'New Folder'
            };

            const success = await persistenceProvider.create(domainObject);
            const expectedModel = {
                type: 'folder',
                name: 'New Folder'
            };

            expect(success).toBe(true);
            expect(mcwsNamespace.opaqueFile('new-object').create)
                .toHaveBeenCalledWith(expectedModel);
        });

        it('updates existing objects', async () => {
            const domainObject = {
                identifier: {
                    namespace: 'some-namespace',
                    key: 'existing-object'
                },
                type: 'folder',
                name: 'Updated Folder'
            };

            const success = await persistenceProvider.update(domainObject);
            const expectedModel = {
                type: 'folder',
                name: 'Updated Folder'
            };

            expect(success).toBe(true);
            expect(mcwsNamespace.opaqueFile('existing-object').replace)
                .toHaveBeenCalledWith(expectedModel);
        });

        it('handles errors during get operation', async () => {
            const errorNamespace = {
                opaqueFile: () => ({
                    read: () => Promise.reject(new Error('Network Error'))
                })
            };
            mcws.namespace.and.returnValue(errorNamespace);

            const identifier = {
                namespace: 'personal-myUser',
                key: 'error-object'
            };
            const result = await persistenceProvider.get(identifier);

            expect(result).toBeUndefined();
        });

        it('handles errors during create operation', async () => {
            const errorNamespace = {
                opaqueFile: () => ({
                    create: () => Promise.reject(new Error('Creation Error'))
                })
            };
            mcws.namespace.and.returnValue(errorNamespace);

            const domainObject = {
                identifier: {
                    namespace: 'personal-myUser',
                    key: 'error-object'
                },
                type: 'folder'
            };
            const success = await persistenceProvider.create(domainObject);

            expect(success).toBe(false);
        });

        it('handles errors during update operation', async () => {
            const errorNamespace = {
                opaqueFile: () => ({
                    replace: () => Promise.reject(new Error('Update Error'))
                })
            };
            mcws.namespace.and.returnValue(errorNamespace);

            const domainObject = {
                identifier: {
                    namespace: 'personal-myUser',
                    key: 'error-object'
                },
                type: 'folder'
            };
            const success = await persistenceProvider.update(domainObject);

            expect(success).toBe(false);
        });
    });
});
