import MCWSPersistenceProvider from '../MCWSPersistenceProvider';
import mcws from '../../services/mcws/mcws';

fdescribe('The MCWS Persistence Provider', () => {
    let mockNamespaceService;
    let persistenceNamespaces;
    let mockNamespace;
    let mockOpaqueFile;
    let persistence;
    let openmct;
    let mcwsPersistenceProvider;

    beforeEach(() => {
        openmct = {
            user: {
                getCurrentUser: () => Promise.resolve({ id: 'myUser' })
            }
        };

        spyOn(mcws, 'namespace');
        mockNamespaceService = jasmine.createSpyObj(
            'namespaceService',
            ['getPersistenceNamespaces']
        );
        
        persistenceNamespaces = [
            {
                key: 'testSpace',
                url: '/test/namespace'
            },
            {
                key: 'testSpace2',
                url: '/test/namespace2'
            }
        ];

        mockNamespaceService
            .getPersistenceNamespaces
            .and.returnValue(Promise.resolve(persistenceNamespaces));


        mockNamespace =
            jasmine.createSpyObj('namespace', ['opaqueFile', 'read']);
        mockOpaqueFile = jasmine.createSpyObj('opaqueFile', [
            'read',
            'replace',
            'remove',
            'create'
        ]);

        mcws.namespace.and.returnValue(mockNamespace);
        mockNamespace.opaqueFile.and.returnValue(mockOpaqueFile);

        mcwsPersistenceProvider = new MCWSPersistenceProvider(
            openmct,
            persistenceNamespaces
        );
    });

    it('provides a promise for available namespaces', async (done) => {
        const spaces = await mcwsPersistenceProvider.getPersistenceNamespaces();
        expect(spaces).toEqual(persistenceNamespaces);
        done();
    });
    
    // DO WE DELETE THIS TEST? I don't think we use this functionality anymore.
    xit('provides a listing of namespaces when provided a namespace definition', async (done) => {
        const namespaceTriples = [
            {
                Subject: '/test/namespace/a',
                Predicate: 'has MIO type',
                Object: 'opaque_file'
            },
            {
                Subject: '/test/namespace/b',
                Predicate: 'has MIO type',
                Object: 'namespace'
            },
            {
                Subject: '/test/namespace/c',
                Predicate: 'something else',
                Object: 'opaque_file'
            },
            {
                Subject: '/some/namespace/xyz',
                Predicate: 'has MIO type',
                Object: 'opaque_file'
            },
            {
                Subject: '/some/namespace/123-ABC',
                Predicate: 'has MIO type',
                Object: 'opaque_file'
            }
        ];
        mockNamespace.read.and.returnValue(Promise.resolve(namespaceTriples));
        
        const objects = await mcwsPersistenceProvider.getNamespacesFromMCWS({ url: '/test/namespace' });
        expect(objects).toEqual(namespaceTriples);
        done();
    });

    it('allows objects to be created', async (done) => {
        mockOpaqueFile.create.and.returnValue(Promise.resolve(true));
        const domainObject = {
            identifier: {
                key: 'testKey',
                namespace: 'testSpace'
            },
            someKey: 'some value'
        };
        const result = await mcwsPersistenceProvider.create(domainObject);
        
        expect(result).toBe(true);
        expect(mockNamespace.opaqueFile)
            .toHaveBeenCalledWith('testKey');
        expect(mockOpaqueFile.create)
            .toHaveBeenCalledWith({ someKey: 'some value' });
        done();
    });

    it('allows objects to be read', async (done) => {
        const identifier = {
            key: 'testKey',
            namespace: 'testSpace'
        };
        const model = {
            someKey: 'some value'
        };
        const domainObject = {
            identifier,
            ...model
        };
        mockOpaqueFile.read.and.returnValue(Promise.resolve({json: () => Promise.resolve(model)}));
        const object = await mcwsPersistenceProvider.get(identifier);
        
        expect(object).toEqual(domainObject);
        expect(mcws.namespace)
            .toHaveBeenCalledWith('/test/namespace');
        expect(mockNamespace.opaqueFile)
            .toHaveBeenCalledWith('testKey');
        expect(mockOpaqueFile.read)
            .toHaveBeenCalled();
        done();
    });

    it('allows objects to be updated', async (done) => {
        mockOpaqueFile.replace.and.returnValue(Promise.resolve(true));
        const domainObject = {
            identifier: {
                key: 'testKey',
                namespace: 'testSpace'
            },
            someKey: 'some value'
        };
        const result = await mcwsPersistenceProvider.update(domainObject);
        
        expect(result).toBe(true);
        expect(mcws.namespace)
            .toHaveBeenCalledWith('/test/namespace');
        expect(mockNamespace.opaqueFile)
            .toHaveBeenCalledWith('testKey');
        expect(mockOpaqueFile.replace)
            .toHaveBeenCalledWith({ someKey: 'some value' });
        done();
    });

    // We don't allow delete in the core API, so we don't need this test.
    xit('allows objects to be deleted', async (done) => {
        mockOpaqueFile.remove.and.returnValue(Promise.resolve(true));
        await mcwsPersistenceProvider.delete({ key: 'testKey', namespace: 'testSpace' });
        
        expect(mcws.namespace)
            .toHaveBeenCalledWith('/test/namespace');
        expect(mockNamespace.opaqueFile)
            .toHaveBeenCalledWith('testKey');
        expect(mockOpaqueFile.remove).toHaveBeenCalled();
        done();
    });

    it('converts rejected promises to promises resolves to undefined', async (done) => {
        mockOpaqueFile.read.and.returnValue(Promise.reject('hello'));
        const result = await mcwsPersistenceProvider.get({ key: 'testKey', namespace: 'testSpace' });
        
        expect(result).toBeUndefined();
        done();
    });
});
